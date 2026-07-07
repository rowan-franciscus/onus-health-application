/**
 * Authentication Controller
 * Handles user authentication-related operations
 */

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const config = require("../config/environment");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const { validatePassword } = require("../utils/passwordPolicy");

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    // Log the incoming request for debugging (never log the raw password)
    logger.debug(
      `Registration attempt for email: ${req.body && req.body.email}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(
        // Log which fields failed, but never the submitted values (may contain the password)
        `Registration validation failed: ${JSON.stringify(errors.array().map(({ path, msg }) => ({ path, msg })))}`,
      );
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // SECURITY: never trust a client-supplied privileged role. Self-registration is
    // limited to patient/provider; admin and practice_admin are created only via
    // authenticated, role-guarded flows. This prevents privilege escalation where an
    // attacker registers directly as an administrator.
    const requestedRole = req.body.role === 'provider' ? 'provider' : 'patient';

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      // Allow claiming a non-Onus placeholder patient record
      if (user.isOnusUser === false && user.role === 'patient') {
        logger.info(`Claiming non-Onus placeholder for email ${email}`);
        user.password = password;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.isOnusUser = true;
        user.isEmailVerified = false;
        await user.save();
        logger.info(`Non-Onus patient ${user._id} claimed via registration`);

        // Notify the provider who registered this patient, if any
        if (user.registeredBy) {
          try {
            const emailService = require('../services/email.service');
            const provider = await User.findById(user.registeredBy).select('firstName lastName email');
            if (provider && provider.email) {
              await emailService.sendTemplateEmail(
                provider.email,
                'patientClaimed',
                {
                  providerFirstName: provider.firstName,
                  patientName: `${user.firstName} ${user.lastName}`,
                  patientEmail: user.email,
                  frontendUrl: config.frontendUrl,
                },
                {
                  subject: `${user.firstName} ${user.lastName} has joined Onus Health`,
                  userId: provider._id,
                  queue: true,
                }
              );
            }
          } catch (notifyErr) {
            logger.error(`Failed to notify provider of patient claim:`, notifyErr);
          }
        }
      } else {
        logger.warn(
          `Registration failed: User already exists with email ${email}`,
        );
        return res.status(400).json({ message: "User already exists" });
      }
    } else {
      // Create new user
      user = new User({
        email,
        password,
        firstName,
        lastName,
        role: requestedRole,
      });

      await user.save();
      logger.info(`User created with ID ${user._id} and email ${email}`);
    }

    // Generate verification token
    const verificationToken = jwt.sign({ id: user._id, type: "verify" }, config.jwtSecret, {
      expiresIn: "24h",
    });
    logger.debug(`Generated verification token for ${email}`);

    // Send verification email
    try {
      const emailService = require("../services/email.service");
      const emailSent = await emailService.sendVerificationEmail(
        user,
        verificationToken,
      );
      logger.info(
        `Verification email sent to ${email}: ${emailSent ? "SUCCESS" : "FAILED"}`,
      );

      // For debugging: log verification URL
      if (config.env === "development") {
        const verificationUrl = `${config.frontendUrl}/verify-email/${verificationToken}`;
        logger.debug(`Development verification URL: ${verificationUrl}`);
      }
    } catch (emailError) {
      logger.error(
        `Failed to send verification email to ${email}:`,
        emailError,
      );
      // Continue with the registration process even if email sending fails
    }

    // If the new user is a provider, notify the admin immediately
    if (user.role === "provider") {
      try {
        const emailService = require("../services/email.service");
        await emailService.sendProviderVerificationRequestEmail(user);
        logger.info(`Admin notified about new provider registration: ${email}`);
      } catch (adminEmailError) {
        logger.error(
          `Failed to send admin notification for new provider ${email}:`,
          adminEmailError,
        );
        // Continue with registration even if admin notification fails
      }
    }

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(
      `User registered successfully: ${email} (${user.role})`,
    );
    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens: {
        authToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`, { error });
    res.status(500).json({ message: "Server error during registration" });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login attempt failed: user not found with email ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login attempt failed: invalid password for user ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.isEmailVerified && !user.googleId && !user.facebookId) {
      logger.info(`Login attempt failed: unverified email for user ${email}`);
      return res.status(403).json({
        message:
          "Email not verified. Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // Block revoked practice admins
    if (user.role === "practice_admin") {
      const status = user.practiceAdminProfile && user.practiceAdminProfile.status;
      if (status === "revoked") {
        return res.status(403).json({
          message: "Your Practice Admin access has been revoked.",
          code: "PRACTICE_ADMIN_REVOKED",
        });
      }
      if (status !== "active") {
        return res.status(403).json({
          message: "Please accept your Practice Admin invitation before logging in.",
          code: "PRACTICE_ADMIN_PENDING",
        });
      }
    }

    // Check if provider is verified by admin
    if (user.role === "provider" && user.isProfileCompleted) {
      // Only check verification status after onboarding is completed
      const isVerified =
        user.providerProfile && user.providerProfile.isVerified;
      if (!isVerified) {
        logger.info(
          `Login attempt failed: provider account not verified by admin for user ${email}`,
        );
        return res.status(403).json({
          message:
            "Your provider account is pending verification. Please wait for admin approval.",
          code: "PROVIDER_NOT_VERIFIED",
        });
      }
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`User ${email} logged in successfully`);

    // Prepare user data for response
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isProfileCompleted: user.isProfileCompleted,
      onboardingCompleted: user.isProfileCompleted, // Include this for frontend compatibility
      profileImage: user.profileImage, // Include profile image
    };

    // Add isVerified flag for providers
    if (user.role === "provider") {
      userData.isVerified =
        user.providerProfile && user.providerProfile.isVerified === true;
      if (user.providerProfile && user.providerProfile.practiceId) {
        userData.practiceId = user.providerProfile.practiceId;
      }
    }

    if (user.role === "practice_admin" && user.practiceAdminProfile) {
      userData.practiceId = user.practiceAdminProfile.practiceId;
      userData.practiceAdminStatus = user.practiceAdminProfile.status;
      // Practice admins don't have onboarding gates
      userData.isProfileCompleted = true;
      userData.onboardingCompleted = true;
    }

    res.json({
      user: userData,
      tokens: {
        authToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify refresh token
    let user;
    try {
      user = await User.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if there's an existing auth token and if it has session timeout
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) {
        try {
          const payload = jwt.verify(token, config.jwtSecret, {
            ignoreExpiration: true,
          });

          // Calculate time since token was issued
          const currentTime = Math.floor(Date.now() / 1000);
          const tokenIssueTime = payload.iat;
          const minutesSinceIssue = Math.floor(
            (currentTime - tokenIssueTime) / 60,
          );

          // If the previous token's session has timed out, don't allow refresh
          if (minutesSinceIssue >= config.sessionTimeout) {
            return res.status(401).json({
              success: false,
              message: "Session timeout",
              code: "SESSION_TIMEOUT",
            });
          }
        } catch (error) {
          // If we can't verify the old token, continue with refresh
          console.log(
            "Could not verify old auth token during refresh:",
            error.message,
          );
        }
      }
    }

    // Generate new tokens
    const newAuthToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    res.json({
      success: true,
      tokens: {
        authToken: newAuthToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Server error during token refresh" });
  }
};

/**
 * Get current user profile
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // User is available from auth middleware
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error while fetching user data" });
  }
};

/**
 * Verify email
 */
exports.verifyEmail = async (req, res) => {
  try {
    // Get token from either params (GET request) or body (POST request)
    const token = req.params.token || (req.body && req.body.token);

    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      // For GET requests, redirect to error page
      if (req.method === "GET") {
        return res.redirect(`${config.frontendUrl}/verification-error`);
      }
      // For POST requests, return JSON error
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Find and update user
    const user = await User.findById(decoded.id);

    if (!user) {
      // For GET requests, redirect to error page
      if (req.method === "GET") {
        return res.redirect(`${config.frontendUrl}/verification-error`);
      }
      // For POST requests, return JSON error
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      // If already verified

      // For GET requests, redirect to app
      if (req.method === "GET") {
        let redirectUrl;
        if (user.isProfileCompleted) {
          // Redirect to role-specific dashboard
          redirectUrl =
            user.role === "patient"
              ? `${config.frontendUrl}/patient/dashboard`
              : user.role === "provider"
                ? `${config.frontendUrl}/provider/dashboard`
                : `${config.frontendUrl}/sign-in`;
        } else {
          // Redirect to role-specific onboarding
          redirectUrl =
            user.role === "patient"
              ? `${config.frontendUrl}/patient/onboarding`
              : `${config.frontendUrl}/provider/onboarding`;
        }

        return res.redirect(redirectUrl);
      }

      // For POST requests, generate tokens and return success so the user can be logged in
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      return res.json({
        success: true,
        message: "Email already verified",
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          onboardingCompleted: user.isProfileCompleted,
          isEmailVerified: true,
          isProfileCompleted: user.isProfileCompleted,
        },
        token: authToken,
        refreshToken: refreshToken,
      });
    }

    // Update user as verified
    user.isEmailVerified = true;
    await user.save();

    logger.info(`Email verified successfully for user: ${user.email}`);
    logger.info(
      `User profile status - isProfileCompleted: ${user.isProfileCompleted}, role: ${user.role}`,
    );

    // Generate new tokens for auto-login
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // For GET requests, redirect to onboarding with proper role path
    if (req.method === "GET") {
      // Always redirect new users to onboarding after email verification
      // They should have isProfileCompleted = false at this point
      let redirectUrl;

      if (!user.isProfileCompleted) {
        // New user - needs onboarding
        redirectUrl =
          user.role === "patient"
            ? `${config.frontendUrl}/patient/onboarding?token=${authToken}`
            : `${config.frontendUrl}/provider/onboarding?token=${authToken}`;
        logger.info(
          `Redirecting new ${user.role} to onboarding: ${redirectUrl}`,
        );
      } else {
        // Existing user who somehow is verifying email again
        redirectUrl =
          user.role === "patient"
            ? `${config.frontendUrl}/patient/dashboard`
            : user.role === "provider"
              ? `${config.frontendUrl}/provider/dashboard`
              : `${config.frontendUrl}/sign-in`;
        logger.info(
          `Redirecting existing ${user.role} to dashboard: ${redirectUrl}`,
        );
      }

      return res.redirect(redirectUrl);
    }

    // For POST requests, return success JSON
    return res.json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        onboardingCompleted: user.isProfileCompleted,
        isEmailVerified: true,
        isProfileCompleted: user.isProfileCompleted,
      },
      token: authToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    logger.error("Email verification error:", error);

    // For GET requests, redirect to error page
    if (req.method === "GET") {
      return res.redirect(`${config.frontendUrl}/verification-error`);
    }

    // For POST requests, return error JSON
    return res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
};

/**
 * Admin login
 */
exports.adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find admin user by email
    const user = await User.findOne({ email, role: "admin" });
    if (!user) {
      logger.warn(
        `Admin login attempt failed: admin not found with email ${email}`,
      );
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(
        `Admin login attempt failed: invalid password for admin ${email}`,
      );
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`Admin ${email} logged in successfully`);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
        onboardingCompleted: user.isProfileCompleted, // Include this for frontend compatibility
        profileImage: user.profileImage, // Include profile image
      },
      tokens: {
        authToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Admin login error:", error);
    res.status(500).json({ message: "Server error during admin login" });
  }
};

/**
 * Request password reset
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(200)
        .json({
          message: "If the email exists, a password reset link will be sent",
        });
    }

    // Generate password reset token
    const resetToken = jwt.sign({ id: user._id, type: "reset" }, config.jwtSecret, {
      expiresIn: "1h",
    });

    // Store token hash in user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Import email service
    const emailService = require("../services/email.service");

    // Send password reset email using the email service
    await emailService.sendPasswordResetEmail(user, resetToken, {
      queue: true, // Queue the email
    });

    return res
      .status(200)
      .json({
        message: "If the email exists, a password reset link will be sent",
      });
  } catch (error) {
    console.error("Password reset request error:", error);
    res
      .status(500)
      .json({ message: "Server error during password reset request" });
  }
};

/**
 * Reset password using token
 */
exports.resetPassword = async (req, res) => {
  try {
    // Enforce route-level validation (token presence + strong-password policy).
    // express-validator middlewares only record errors; without this check a weak
    // password would bypass the policy entirely on this endpoint.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Find user by ID and token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Import email service
    const emailService = require("../services/email.service");

    // Send confirmation email using the email service
    await emailService.sendTemplateEmail(
      user.email,
      "passwordResetSuccess",
      {
        firstName: user.firstName,
        frontendUrl: config.frontendUrl,
      },
      {
        subject: "Password Reset Successful",
        userId: user._id,
        queue: true,
      },
    );

    return res
      .status(200)
      .json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

/**
 * Check session status (used for keeping session alive)
 */
exports.checkSessionStatus = async (req, res) => {
  try {
    // User is already verified by auth middleware
    const user = req.user;

    // Generate a new auth token with updated issue time to keep session alive
    const newAuthToken = user.generateAuthToken();

    res.json({
      success: true,
      message: "Session is active",
      userId: user._id,
      token: newAuthToken, // Return new token to refresh the session
    });
  } catch (error) {
    console.error("Session status check error:", error);
    res.status(500).json({ message: "Error checking session status" });
  }
};

/**
 * Resend verification email
 */
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({
        success: true,
        message: "If the email exists, a verification link will be sent",
      });
    }

    // Don't resend if already verified
    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified. Please sign in.",
      });
    }

    // Generate a new verification token
    const verificationToken = jwt.sign({ id: user._id, type: "verify" }, config.jwtSecret, {
      expiresIn: "24h",
    });

    // Send the verification email
    try {
      const emailService = require("../services/email.service");
      const emailSent = await emailService.sendVerificationEmail(
        user,
        verificationToken,
      );

      logger.info(
        `Resent verification email to ${email}: ${emailSent ? "SUCCESS" : "FAILED"}`,
      );

      // For debugging: log verification URL
      if (config.env === "development") {
        const verificationUrl = `${config.frontendUrl}/verify-email/${verificationToken}`;
        logger.debug(`Development verification URL: ${verificationUrl}`);
      }

      return res.status(200).json({
        success: true,
        message: "Verification email has been sent",
      });
    } catch (emailError) {
      logger.error(
        `Failed to resend verification email to ${email}:`,
        emailError,
      );
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (error) {
    logger.error("Resend verification email error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
};

/**
 * GET /auth/practice-admin-invite/:token
 * Look up the invite. Returns name/email so the accept page can prefill.
 */
exports.getPracticeAdminInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      role: "practice_admin",
      "practiceAdminProfile.inviteToken": token,
    }).select("firstName lastName email practiceAdminProfile");

    if (!user) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }
    if (
      user.practiceAdminProfile.inviteTokenExpires &&
      user.practiceAdminProfile.inviteTokenExpires < new Date()
    ) {
      return res.status(410).json({ success: false, message: "Invitation has expired" });
    }
    if (user.practiceAdminProfile.status !== "pending") {
      return res.status(409).json({ success: false, message: "Invitation already used" });
    }

    res.json({
      success: true,
      invite: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error("getPracticeAdminInvite error:", error);
    res.status(500).json({ success: false, message: "Failed to load invite" });
  }
};

/**
 * POST /auth/practice-admin-invite/:token/accept
 * Body: { password }
 * Activates the practice admin account and returns auth tokens.
 */
exports.acceptPracticeAdminInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const user = await User.findOne({
      role: "practice_admin",
      "practiceAdminProfile.inviteToken": token,
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }
    if (
      user.practiceAdminProfile.inviteTokenExpires &&
      user.practiceAdminProfile.inviteTokenExpires < new Date()
    ) {
      return res.status(410).json({ success: false, message: "Invitation has expired" });
    }
    if (user.practiceAdminProfile.status !== "pending") {
      return res.status(409).json({ success: false, message: "Invitation already used" });
    }

    user.password = password;
    user.isEmailVerified = true;
    user.isProfileCompleted = true;
    user.practiceAdminProfile.status = "active";
    user.practiceAdminProfile.inviteToken = undefined;
    user.practiceAdminProfile.inviteTokenExpires = undefined;
    await user.save();

    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isProfileCompleted: true,
        onboardingCompleted: true,
        practiceId: user.practiceAdminProfile.practiceId,
        practiceAdminStatus: "active",
      },
      tokens: { authToken, refreshToken },
    });
  } catch (error) {
    logger.error("acceptPracticeAdminInvite error:", error);
    res.status(500).json({ success: false, message: "Failed to accept invitation" });
  }
};
