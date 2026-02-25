import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";

const signToken = (payload: object): string => {
    const secret = process.env.JWT_SECRET as string;
    const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as string;
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// ─── REGISTER ───────────────────────────────────────────────────────────────
export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { companyName, email, phone, password, confirmPassword } = req.body;

        // --- Validation ---
        const errors: Record<string, string> = {};
        if (!companyName?.trim()) errors.companyName = "Company name is required";
        if (!email?.trim()) errors.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Invalid email format";
        if (!phone?.trim()) errors.phone = "Phone number is required";
        if (!password) errors.password = "Password is required";
        else if (password.length < 8) errors.password = "Password must be at least 8 characters";
        if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
        else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

        if (Object.keys(errors).length > 0) {
            res.status(422).json({ success: false, errors });
            return;
        }

        // --- Check duplicate email ---
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            res.status(409).json({
                success: false,
                errors: { email: "An account with this email already exists" },
            });
            return;
        }

        // --- Hash password ---
        const passwordHash = await bcrypt.hash(password, 12);

        // --- Create user ---
        const user = await User.create({
            companyName: companyName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone?.trim(),
            passwordHash,
            role: "user",
            status: "active",
        });

        // --- Issue JWT ---
        const token = signToken({
            id: user._id,
            email: user.email,
            role: user.role,
            companyName: user.companyName,
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user: {
                id: user._id,
                companyName: user.companyName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;

        // --- Validation ---
        const errors: Record<string, string> = {};
        if (!email?.trim()) errors.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Invalid email format";
        if (!password) errors.password = "Password is required";

        if (Object.keys(errors).length > 0) {
            res.status(422).json({ success: false, errors });
            return;
        }

        // --- Find user ---
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        // --- Check status ---
        if (user.status !== "active") {
            res.status(403).json({
                success: false,
                message: "Your account has been suspended. Please contact support.",
            });
            return;
        }

        // --- Check password ---
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        // --- Issue JWT ---
        const token = signToken({
            id: user._id,
            email: user.email,
            role: user.role,
            companyName: user.companyName,
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                companyName: user.companyName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
export const getMe = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authReq = req as Request & { user?: { id: string } };
        const user = await User.findById(authReq.user?.id).select("-passwordHash");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};
