"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActiveSessions = exports.revokeAllSessions = exports.revokeSession = exports.rotateRefreshToken = exports.generateTokenPair = exports.issueRefreshToken = exports.issueAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const Session_1 = __importDefault(require("../models/Session"));
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** SHA-256 hash of the raw refresh token for safe storage */
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
/** Issue a short-lived access token (15 minutes) */
const issueAccessToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '15m' });
};
exports.issueAccessToken = issueAccessToken;
/** Issue a long-lived refresh token (7 days) as an opaque random value */
const issueRefreshToken = () => crypto_1.default.randomBytes(64).toString('hex');
exports.issueRefreshToken = issueRefreshToken;
// ─── Token Pair Generation & Session Persistence ─────────────────────────────
/**
 * Creates an access token + refresh token, stores a hashed copy of the
 * refresh token in a new Session document, and returns the raw pair.
 */
const generateTokenPair = async (payload, meta) => {
    const accessToken = (0, exports.issueAccessToken)(payload);
    const refreshToken = (0, exports.issueRefreshToken)();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Session_1.default.create({
        userId: payload.id,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        isRevoked: false,
        expiresAt,
    });
    return { accessToken, refreshToken };
};
exports.generateTokenPair = generateTokenPair;
// ─── Refresh Token Rotation ───────────────────────────────────────────────────
/**
 * Given a raw refresh token and the userId, validates the existing session,
 * revokes it, creates a new session, and returns a fresh token pair.
 * Throws if the session is invalid, expired, or revoked.
 */
const rotateRefreshToken = async (rawRefreshToken, userId, payload, meta) => {
    const hash = hashToken(rawRefreshToken);
    const session = await Session_1.default.findOne({
        userId,
        refreshTokenHash: hash,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
    });
    if (!session) {
        throw new Error('Invalid or expired refresh token');
    }
    // Revoke the old session (rotation — one-time use)
    session.isRevoked = true;
    await session.save();
    // Issue a fresh token pair
    return (0, exports.generateTokenPair)(payload, meta);
};
exports.rotateRefreshToken = rotateRefreshToken;
// ─── Session Revocation ───────────────────────────────────────────────────────
/** Revoke a single session by its refresh token hash */
const revokeSession = async (rawRefreshToken) => {
    await Session_1.default.updateOne({ refreshTokenHash: hashToken(rawRefreshToken) }, { isRevoked: true });
};
exports.revokeSession = revokeSession;
/** Revoke all active sessions for a user (logout everywhere) */
const revokeAllSessions = async (userId) => {
    await Session_1.default.updateMany({ userId, isRevoked: false }, { isRevoked: true });
};
exports.revokeAllSessions = revokeAllSessions;
/** List all active sessions for a user */
const listActiveSessions = async (userId) => {
    return Session_1.default.find({ userId, isRevoked: false, expiresAt: { $gt: new Date() } }, { refreshTokenHash: 0 } // never expose the hash
    ).sort({ lastUsed: -1 });
};
exports.listActiveSessions = listActiveSessions;
