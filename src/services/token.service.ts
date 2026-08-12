import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session';
import { UserRole } from '../models/User';

interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  companyName: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256 hash of the raw refresh token for safe storage */
const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Issue a short-lived access token (15 minutes) */
export const issueAccessToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign(payload, secret, { expiresIn: '15m' });
};

/** Issue a refresh token as an opaque random value */
export const issueRefreshToken = (): string => crypto.randomBytes(64).toString('hex');

// ─── Token Pair Generation & Session Persistence ─────────────────────────────

/**
 * Creates an access token + refresh token, stores a hashed copy of the
 * refresh token in a new Session document, and returns the raw pair.
 */
export const generateTokenPair = async (
  payload: TokenPayload,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<TokenPair> => {
  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken();

  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await Session.create({
    userId: payload.id,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
    isRevoked: false,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

// ─── Refresh Token Rotation ───────────────────────────────────────────────────

/**
 * Validates a refresh token and returns the associated userId.
 */
export const getUserIdFromRefreshToken = async (rawRefreshToken: string): Promise<string | null> => {
  const hash = hashToken(rawRefreshToken);
  const session = await Session.findOne({
    refreshTokenHash: hash,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
  return session ? session.userId : null;
};

/**
 * Given a raw refresh token and the userId, validates the existing session,
 * revokes it, creates a new session, and returns a fresh token pair.
 * Throws if the session is invalid, expired, or revoked.
 */
export const rotateRefreshToken = async (
  rawRefreshToken: string,
  userId: string,
  payload: TokenPayload,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<TokenPair> => {
  const hash = hashToken(rawRefreshToken);

  const session = await Session.findOne({
    userId,
    refreshTokenHash: hash,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new Error('Invalid or expired refresh token');
  }

  // DO NOT revoke the old session to prevent multi-tab race conditions.
  // Instead, update the lastUsed timestamp and slide the expiration window.
  session.lastUsed = new Date();
  session.expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // Sliding 1-hour window
  await session.save();

  const accessToken = issueAccessToken(payload);

  // Return the new access token but reuse the SAME refresh token
  return { accessToken, refreshToken: rawRefreshToken };
};

// ─── Session Revocation ───────────────────────────────────────────────────────

/** Revoke a single session by its refresh token hash */
export const revokeSession = async (rawRefreshToken: string): Promise<void> => {
  await Session.updateOne({ refreshTokenHash: hashToken(rawRefreshToken) }, { isRevoked: true });
};

/** Revoke all active sessions for a user (logout everywhere) */
export const revokeAllSessions = async (userId: string): Promise<void> => {
  await Session.updateMany({ userId, isRevoked: false }, { isRevoked: true });
};

/** List all active sessions for a user */
export const listActiveSessions = async (userId: string) => {
  return Session.find(
    { userId, isRevoked: false, expiresAt: { $gt: new Date() } },
    { refreshTokenHash: 0 } // never expose the hash
  ).sort({ lastUsed: -1 });
};
