/**
 * Password complexity policy — single source of truth (server side).
 *
 * Every server-side password entry point (registration, password reset,
 * practice-admin invite acceptance, and in-app change-password) validates
 * through this module so the rule can never drift between endpoints.
 *
 * IMPORTANT: keep this in sync with client/src/utils/passwordPolicy.js.
 * The special-character set here is authoritative; the client set must be a
 * subset of it so a password accepted client-side is never rejected server-side.
 */

const MIN_LENGTH = 8;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>_\-]/;

const REQUIREMENTS_TEXT =
  'Password must be at least 8 characters and include at least one number and one special character';

/**
 * Validate a password against the complexity policy.
 * @param {string} password
 * @returns {string|null} A human-readable error message, or null if the
 *   password satisfies the policy.
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return 'Password must be at least 8 characters';
  }
  if (!NUMBER_REGEX.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!SPECIAL_REGEX.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

module.exports = {
  MIN_LENGTH,
  NUMBER_REGEX,
  SPECIAL_REGEX,
  REQUIREMENTS_TEXT,
  validatePassword,
};
