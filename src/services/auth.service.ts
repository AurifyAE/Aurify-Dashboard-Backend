import User, { IUser } from '../models/User';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Account Lockout ──────────────────────────────────────────────────────────

/** Returns true if the account is currently locked */
export const isAccountLocked = (user: IUser): boolean => {
  if (!user.lockUntil) return false;
  return user.lockUntil > new Date();
};

/**
 * Increments failed login attempt count.
 * Locks the account after MAX_LOGIN_ATTEMPTS consecutive failures.
 */
export const recordFailedLogin = async (user: IUser): Promise<void> => {
  user.loginAttempts = (user.loginAttempts || 0) + 1;

  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }

  await user.save();
};

/** Resets login attempt counters after a successful login */
export const resetLoginAttempts = async (user: IUser): Promise<void> => {
  if (user.loginAttempts !== 0 || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }
};

// ─── Password Strength Validation ─────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  'Password123!',
  'Welcome@123',
  'Qwerty@123',
  'Admin@1234',
  'P@ssword1',
  'Passw0rd!',
]);

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validates password strength:
 *  - 10+ characters
 *  - uppercase, lowercase, number, symbol
 *  - must not contain the user's email
 *  - must not be in common password list
 */
export const validatePasswordStrength = (
  password: string,
  email?: string
): PasswordValidationResult => {
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

// ─── Consistent Response Timing ───────────────────────────────────────────────
// Always returning the same generic message prevents user enumeration attacks
// (attacker cannot distinguish "user not found" from "wrong password").
export const AUTH_FAIL_MESSAGE = 'Invalid email or password';

// ─── Cookie Helpers ───────────────────────────────────────────────────────────
/** Returns cookie options based on the environment */
export const getTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes — matches access token lifetime
});

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 1 * 60 * 60 * 1000, // 1 hour
});
