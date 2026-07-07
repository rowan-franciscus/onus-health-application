/**
 * Password complexity policy — single source of truth (client side).
 *
 * Every client-side password form (sign-up, password reset, practice-admin
 * invite acceptance, and the per-role change-password forms) validates through
 * this module so the rule can never drift between screens.
 *
 * IMPORTANT: keep this in sync with server/utils/passwordPolicy.js. The special
 * character set below is identical to the server's; do not broaden it, or a
 * password accepted here could be rejected by the server with a 400.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_NUMBER_REGEX = /[0-9]/;
export const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>_\-]/;

// Human-readable requirement list for rendering hints next to password inputs.
export const PASSWORD_REQUIREMENTS = [
  'Be at least 8 characters long',
  'Include at least one number',
  'Include at least one special character',
];

/**
 * Validate a password against the complexity policy.
 * @param {string} password
 * @returns {string|null} A human-readable error message, or null if valid.
 */
export function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters';
  }
  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!PASSWORD_SPECIAL_REGEX.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}
