import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

// Extend Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    companyName: string;
  };
}

// ─── Token Extraction Helper ─────────────────────────────────────────────────
/**
 * Extracts the JWT from:
 * 1. HttpOnly cookie `aurify_token` (primary — secure storage)
 * 2. Authorization: Bearer <token> header (fallback — backward compat during migration)
 */
const extractToken = (req: Request): string | null => {
  // Primary: HttpOnly cookie
  if (req.cookies?.aurify_token) return req.cookies.aurify_token as string;

  // Fallback: Authorization header (legacy / API clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];

  return null;
};

// ─── PROTECT MIDDLEWARE ───────────────────────────────────────────────────────
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: UserRole;
      companyName: string;
    };

    const { default: User } = await import('../models/User');
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

    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
    });
  }
};

// ─── OPTIONAL AUTH: set req.user if valid token, never reject ─────────────────
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: UserRole;
      companyName: string;
    };
    (req as AuthRequest).user = decoded;
  } catch {
    // invalid token — continue without user
  }
  next();
};

// ─── ROLE GUARD MIDDLEWARE ────────────────────────────────────────────────────
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
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
