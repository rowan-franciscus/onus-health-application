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
const auditService = require("../services/audit.service");
const consentService = require("../services/consent.service");

// Audit helper for authentication outcomes. Never pass credentials in here.
const auditAuth = (req, subtype, outcome, extra = {}) => {
  auditService.logFromRequest(req, {
    type: "auth",
    subtype,
    action: "E",
    outcome,
    ...extra,
  });
};

/**
 * Tell the provider who created a placeholder record that the patient has
 * claimed it. Non-fatal on failure.
 */
const notifyProviderOfClaim = async (user) => {
  if (!user.registeredBy) return;
  try {
    const emailService = require("../services/email.service");
    const provider = await User.findById(user.registeredBy).select("firstName lastName email");
    if (provider && provider.email) {
      await emailService.sendTemplateEmail(
        provider.email,
        "patientClaimed",
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
        },
      );
    }
  } catch (notifyErr) {
    logger.error(`Failed to notify provider of patient claim:`, notifyErr);
  }
};

/**
 * Email a claim link to a provider-created record's own address (used when
 * sign-up matches it on email + DOB). Non-fatal on failure.
 */
const sendClaimLinkEmail = async (req, placeholder) => {
  try {
    const rawClaim = await consentService.issueClaimToken(placeholder._id);
    if (!rawClaim) return;
    const emailService = require("../services/email.service");
    await emailService.sendTemplateEmail(
      placeholder.email,
      "claimProfileLink",
      {
        title: "Claim your health record",
        patientFirstName: placeholder.firstName,
        claimUrl: `${config.frontendUrl}/claim/${rawClaim}`,
      },
      {
        subject: "Claim your health record on Onus Health",
        userId: placeholder._id,
        queue: true,
      },
    );
    auditService.logFromRequest(req, {
      type: "auth",
      subtype: "record-claim-link-sent",
      action: "E",
      entity: { resourceType: "User", resourceId: placeholder._id, patientId: placeholder._id },
    });
  } catch (error) {
    logger.error(`Failed to send claim link for ${placeholder._id}:`, error);
  }
};

/**
 * Turn a provider-created placeholder into the patient's own account, in
 * place (same _id, so every connection and record stays attached).
 * Caller must already have matched the patient by claim token and DOB; the
 * link was emailed to this address, which proves access to it.
 */
const claimPlaceholder = async (req, placeholder, { password, firstName, lastName }) => {
  placeholder.password = password;
  placeholder.firstName = (firstName && firstName.trim()) || placeholder.firstName;
  placeholder.lastName = (lastName && lastName.trim()) || placeholder.lastName;
  placeholder.isOnusUser = true;
  placeholder.isEmailVerified = true;
  placeholder.claimedAt = new Date();
  placeholder.claimTokens = [];
  await placeholder.save();
  logger.info(`Non-Onus patient ${placeholder._id} claimed via claim-link`);

  auditService.logFromRequest(req, {
    type: "auth",
    subtype: "record-claimed",
    action: "U",
    outcomeDesc: "claim-link",
    agent: { userId: placeholder._id, role: "patient" },
    entity: { resourceType: "User", resourceId: placeholder._id, patientId: placeholder._id },
  });

  await notifyProviderOfClaim(placeholder);
  return placeholder;
};

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

    // Real accounts are unique per email; provider-created placeholders are not
    let user = await User.findOne({ email, isOnusUser: { $ne: false } });
    if (user) {
      logger.warn(
        `Registration failed: User already exists with email ${email}`,
      );
      return res.status(400).json({ message: "User already exists" });
    }

    // A provider may already hold a record for this person. Link to it only
    // on email AND date of birth (shared family emails are common), so the
    // patient never ends up with two records and email alone never links one.
    const placeholders = requestedRole === "patient"
      ? await User.find({ email, role: "patient", isOnusUser: false })
      : [];
    const { dateOfBirth } = req.body;

    if (placeholders.length > 0 && !dateOfBirth) {
      return res.status(409).json({
        code: "RECORD_EXISTS_VERIFY_DOB",
        message:
          "A health record may already exist for this email. Enter your date of birth so we can link it to your account.",
      });
    }
    if (dateOfBirth && !consentService.toDateKey(dateOfBirth)) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    const placeholder = placeholders.find((p) =>
      consentService.sameDob(dateOfBirth, p.patientProfile?.dateOfBirth),
    );

    if (placeholder) {
      // Email + DOB aren't secret, so they never hand over the record (and its
      // clinical data) here. Email a claim link instead: claiming then needs
      // access to the inbox, exactly like the link in the consent email.
      await sendClaimLinkEmail(req, placeholder);
      return res.status(202).json({
        success: true,
        code: "CLAIM_LINK_SENT",
        message:
          "A health record already exists for you. We've emailed you a link to claim it and finish creating your account.",
      });
    }

    // Create new user
    user = new User({
      email,
      password,
      firstName,
      lastName,
      role: requestedRole,
      ...(requestedRole === "patient" && dateOfBirth
        ? { patientProfile: { dateOfBirth: new Date(consentService.toDateKey(dateOfBirth)) } }
        : {}),
    });

    await user.save();
    logger.info(`User created with ID ${user._id} and email ${email}`);

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
    const user = await User.findOne({ email, isOnusUser: { $ne: false } });
    if (!user) {
      logger.warn(`Login attempt failed: user not found with email ${email}`);
      auditAuth(req, "login-failure", "8", { outcomeDesc: "user-not-found" });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login attempt failed: invalid password for user ${email}`);
      auditAuth(req, "login-failure", "8", {
        outcomeDesc: "invalid-password",
        agent: { userId: user._id, role: user.role },
      });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.isEmailVerified && !user.googleId && !user.facebookId) {
      logger.info(`Login attempt failed: unverified email for user ${email}`);
      auditAuth(req, "login-failure", "8", {
        outcomeDesc: "email-not-verified",
        agent: { userId: user._id, role: user.role },
      });
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
        auditAuth(req, "login-failure", "8", {
          outcomeDesc: "practice-admin-revoked",
          agent: { userId: user._id, role: user.role },
        });
        return res.status(403).json({
          message: "Your Practice Admin access has been revoked.",
          code: "PRACTICE_ADMIN_REVOKED",
        });
      }
      if (status !== "active") {
        auditAuth(req, "login-failure", "8", {
          outcomeDesc: "practice-admin-pending",
          agent: { userId: user._id, role: user.role },
        });
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
        auditAuth(req, "login-failure", "8", {
          outcomeDesc: "provider-not-verified",
          agent: { userId: user._id, role: user.role },
        });
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
    auditAuth(req, "login-success", "0", {
      agent: { userId: user._id, role: user.role },
    });

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
            // This is where session expiry is actually enforced, so this is
            // where the audit event belongs. req.user is not set on this
            // route: attribute the actor from the verified token payload.
            auditAuth(req, "session-timeout", "8", {
              outcomeDesc: "session-timeout",
              agent: { userId: payload.id || null, role: payload.role },
            });
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

    // SECURITY: only accept tokens minted for email verification. Access/reset
    // tokens share the signing secret, and this handler has no stored-token check,
    // so without this a same-secret token of any purpose could verify an email.
    if (decoded.type !== "verify") {
      if (req.method === "GET") {
        return res.redirect(`${config.frontendUrl}/verification-error`);
      }
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
      auditAuth(req, "login-failure", "8", { outcomeDesc: "user-not-found" });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(
        `Admin login attempt failed: invalid password for admin ${email}`,
      );
      auditAuth(req, "login-failure", "8", {
        outcomeDesc: "invalid-password",
        agent: { userId: user._id, role: user.role },
      });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`Admin ${email} logged in successfully`);
    auditAuth(req, "login-success", "0", {
      agent: { userId: user._id, role: user.role },
    });
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
    const user = await User.findOne({ email, isOnusUser: { $ne: false } });
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

    auditAuth(req, "password-reset-requested", "0", {
      agent: { userId: user._id, role: user.role },
    });

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

    // SECURITY: reject any token not explicitly minted for password reset.
    // Access/verify tokens are signed with the same secret; require the "reset"
    // purpose so they can't be replayed here (defense-in-depth alongside the
    // stored-token lookup below).
    if (decoded.type !== "reset") {
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
      auditAuth(req, "password-reset", "8", {
        outcomeDesc: "invalid-or-expired-token",
      });
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    auditAuth(req, "password-reset", "0", {
      agent: { userId: user._id, role: user.role },
    });

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
    const user = await User.findOne({ email, isOnusUser: { $ne: false } });
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

/**
 * Logout
 * JWTs are discarded client-side; this endpoint exists solely to record the
 * logout in the audit trail.
 */
exports.logout = async (req, res) => {
  auditAuth(req, "logout", "0");
  res.json({ success: true, message: "Logged out" });
};

const maskEmail = (email) => {
  if (!email) return null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
};

/**
 * GET /api/auth/claim/:token — who the claim link is for (masked).
 */
exports.getClaim = async (req, res) => {
  try {
    const patient = await consentService.findPatientByClaimToken(req.params.token);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "This link is no longer valid. Your profile may already be claimed — try signing in.",
      });
    }
    res.json({
      success: true,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      maskedEmail: maskEmail(patient.email),
    });
  } catch (error) {
    logger.error(`Get claim error: ${error.message}`, { error });
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

/**
 * POST /api/auth/claim/:token — create an account by claiming the
 * provider-created record. Requires the claim link AND the record's DOB.
 */
exports.claimProfile = async (req, res) => {
  try {
    const { password, dateOfBirth, firstName, lastName } = req.body || {};

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }
    if (!consentService.toDateKey(dateOfBirth)) {
      return res.status(400).json({ success: false, message: "Please enter a valid date of birth." });
    }

    const patient = await consentService.findPatientByClaimToken(req.params.token);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "This link is no longer valid. Your profile may already be claimed — try signing in.",
      });
    }
    if (!consentService.sameDob(dateOfBirth, patient.patientProfile?.dateOfBirth)) {
      auditAuth(req, "record-claim-failed", "4", {
        outcomeDesc: "dob-mismatch",
        entity: { resourceType: "User", resourceId: patient._id, patientId: patient._id },
      });
      return res.status(422).json({ success: false, message: "That date of birth does not match our records." });
    }

    await claimPlaceholder(req, patient, { password, firstName, lastName });

    res.status(201).json({
      success: true,
      message: "Your profile has been claimed. You can now sign in.",
      email: patient.email,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An Onus Health account already uses this email address. Please sign in instead.",
      });
    }
    logger.error(`Claim profile error: ${error.message}`, { error });
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
