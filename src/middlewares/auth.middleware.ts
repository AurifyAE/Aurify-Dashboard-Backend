import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/User";

// Extend Request to include user
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        companyName: string;
    };
}

// ─── PROTECT MIDDLEWARE ───────────────────────────────────────────────────────
export const protect = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token, secret) as {
            id: string;
            email: string;
            role: UserRole;
            companyName: string;
        };

        (req as AuthRequest).user = decoded;
        next();
    } catch {
        res.status(401).json({
            success: false,
            message: "Invalid or expired token. Please login again.",
        });
    }
};

// ─── OPTIONAL AUTH: set req.user if valid token, never reject ──────────────
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }
    const token = authHeader.split(" ")[1];
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

// ─── ROLE GUARD MIDDLEWARE ─────────────────────────────────────────────────
export const requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authReq = req as AuthRequest;
        if (!authReq.user || !roles.includes(authReq.user.role)) {
            res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission to perform this action.",
            });
            return;
        }
        next();
    };
};
