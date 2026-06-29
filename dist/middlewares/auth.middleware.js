'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.requireRole = exports.optionalAuth = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require('jsonwebtoken'));
// ─── PROTECT MIDDLEWARE ───────────────────────────────────────────────────────
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    const decoded = jsonwebtoken_1.default.verify(token, secret);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
    });
  }
};
exports.protect = protect;
// ─── OPTIONAL AUTH: set req.user if valid token, never reject ──────────────
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    const decoded = jsonwebtoken_1.default.verify(token, secret);
    req.user = decoded;
  } catch {
    // invalid token — continue without user
  }
  next();
};
exports.optionalAuth = optionalAuth;
// ─── ROLE GUARD MIDDLEWARE ─────────────────────────────────────────────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    const authReq = req;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.',
      });
      return;
    }
    next();
  };
};
exports.requireRole = requireRole;
