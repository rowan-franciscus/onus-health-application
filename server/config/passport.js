/**
 * Passport Configuration
 * Sets up JWT and Google OAuth authentication strategies
 */

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const config = require('./environment');
const logger = require('../utils/logger');

// Configure JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // SECURITY: only accept tokens explicitly minted as API access tokens.
      // This rejects email-verification and password-reset tokens (which are signed
      // with the same secret) from being replayed as bearer credentials.
      if (payload.type !== 'access') {
        return done(null, false);
      }

      // Find the user by ID from JWT payload
      const user = await User.findById(payload.id).select('-password');

      if (!user) {
        return done(null, false);
      }

      // Check if user is verified
      if (!user.isEmailVerified) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      logger.error('JWT Auth: Error during authentication:', error);
      return done(error, false);
    }
  })
);

// Configure Google OAuth Strategy if credentials are provided
if (config.googleClientId && config.googleClientSecret && config.googleCallbackUrl) {
  passport.use(
    new GoogleStrategy({
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ 'googleId': profile.id });

        if (user) {
          return done(null, user);
        }
        
        // Check if a user with the same email exists
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google ID to existing account
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }
        
        // Create a new user
        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          isEmailVerified: true, // Google accounts are already verified
          role: 'patient' // Default role for Google signup
        });
        
        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    })
  );
}

// Configure Facebook OAuth Strategy if credentials are provided
if (config.facebookAppId && config.facebookAppSecret && config.facebookCallbackUrl) {
  passport.use(
    new FacebookStrategy({
      clientID: config.facebookAppId,
      clientSecret: config.facebookAppSecret,
      callbackURL: config.facebookCallbackUrl,
      profileFields: ['id', 'emails', 'name']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Facebook ID
        let user = await User.findOne({ 'facebookId': profile.id });

        if (user) {
          return done(null, user);
        }
        
        // Check if a user with the same email exists
        if (profile.emails && profile.emails.length > 0) {
          user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // Link Facebook ID to existing account
            user.facebookId = profile.id;
            await user.save();
            return done(null, user);
          }
          
          // Create a new user
          const newUser = new User({
            facebookId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            isEmailVerified: true, // Facebook accounts are already verified
            role: 'patient' // Default role for Facebook signup
          });
          
          await newUser.save();
          return done(null, newUser);
        } else {
          // Facebook account doesn't have email
          return done(null, false, { message: 'Facebook account must have an email address' });
        }
      } catch (error) {
        return done(error, false);
      }
    })
  );
}

module.exports = passport; 