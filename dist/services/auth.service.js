'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getRefreshCookieOptions =
  exports.getTokenCookieOptions =
  exports.AUTH_FAIL_MESSAGE =
  exports.validatePasswordStrength =
  exports.resetLoginAttempts =
  exports.recordFailedLogin =
  exports.isAccountLocked =
    void 0;
// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
// ─── Account Lockout ──────────────────────────────────────────────────────────
/** Returns true if the account is currently locked */
const isAccountLocked = (user) => {
  if (!user.lockUntil) return false;
  return user.lockUntil > new Date();
};
exports.isAccountLocked = isAccountLocked;
/**
 * Increments failed login attempt count.
 * Locks the account after MAX_LOGIN_ATTEMPTS consecutive failures.
 */
const recordFailedLogin = async (user) => {
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  await user.save();
};
exports.recordFailedLogin = recordFailedLogin;
/** Resets login attempt counters after a successful login */
const resetLoginAttempts = async (user) => {
  if (user.loginAttempts !== 0 || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }
};
exports.resetLoginAttempts = resetLoginAttempts;
// ─── Password Strength Validation ─────────────────────────────────────────────
const COMMON_PASSWORDS = new Set([
  'Password123!',
  'Welcome@123',
  'Qwerty@123',
  'Admin@1234',
  'P@ssword1',
  'Passw0rd!',
]);
/**
 * Validates password strength:
 *  - 10+ characters
 *  - uppercase, lowercase, number, symbol
 *  - must not contain the user's email
 *  - must not be in common password list
 */
const validatePasswordStrength = (password, email) => {
  if (password.length < 10) {
    return { valid: false, message: 'Password must be at least 10 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (emailPrefix.length > 3 && password.toLowerCase().includes(emailPrefix)) {
      return { valid: false, message: 'Password must not contain your email address' };
    }
  }
  if (COMMON_PASSWORDS.has(password)) {
    return { valid: false, message: 'This password is too common. Please choose a stronger one.' };
  }
  return { valid: true };
};
exports.validatePasswordStrength = validatePasswordStrength;
// ─── Consistent Response Timing ───────────────────────────────────────────────
// Always returning the same generic message prevents user enumeration attacks
// (attacker cannot distinguish "user not found" from "wrong password").
exports.AUTH_FAIL_MESSAGE = 'Invalid email or password';
// ─── Cookie Helpers ───────────────────────────────────────────────────────────
/** Returns cookie options based on the environment */
const getTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes — matches access token lifetime
});
exports.getTokenCookieOptions = getTokenCookieOptions;
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
exports.getRefreshCookieOptions = getRefreshCookieOptions;
