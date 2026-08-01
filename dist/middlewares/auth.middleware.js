"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ─── PROTECT MIDDLEWARE ───────────────────────────────────────────────────────
const protect = async (req, res, next) => {
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
        const { default: User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
        const userExists = await User.findById(decoded.id);
        if (!userExists) {
            res.status(401).json({
                success: false,
                message: 'User no longer exists.',
            });
            return;
        }
        if (userExists.status !== 'active') {
            res.status(403).json({
                success: false,
                message: 'User is suspended or inactive.',
            });
            return;
        }
        req.user = decoded;
        next();
    }
    catch (error) {
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
    }
    catch {
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
