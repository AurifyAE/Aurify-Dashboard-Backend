import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Merchant from '../models/Merchant';
import {
  isAccountLocked,
  recordFailedLogin,
  resetLoginAttempts,
  validatePasswordStrength,
  AUTH_FAIL_MESSAGE,
  getTokenCookieOptions,
  getRefreshCookieOptions,
} from '../services/auth.service';
import {
  generateTokenPair,
  rotateRefreshToken,
  revokeAllSessions,
  revokeSession,
  issueAccessToken,
} from '../services/token.service';
import { logAudit, logSecurity } from '../services/audit.service';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const merchantIdFromUser = (userId: string) => `m_${userId}`;

// ─── REGISTER ────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Joi validation middleware already validated the shape.
    const { companyName, email, phone, password, logo, services } = req.body;

    // Password strength (with email check)
    const passwordCheck = validatePasswordStrength(password, email);
    if (!passwordCheck.valid) {
      res.status(422).json({ success: false, errors: { password: passwordCheck.message } });
      return;
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        errors: { email: 'An account with this email already exists' },
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      companyName: companyName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      passwordHash,
      role: 'user',
      status: 'active',
    });

    // Generate slug and merchantId
    const baseSlug = slugify(companyName || email);
    let slug = baseSlug || `merchant-${Date.now()}`;
    let suffix = 1;
    while (await Merchant.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    // Create merchant profile immediately
    await Merchant.create({
      merchantId: merchantIdFromUser(user._id.toString()),
      userId: user._id.toString(),
      companyName: companyName.trim(),
      slug,
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      status: 'Pending',
      services: {
        tvDisplay: services?.tvDisplay || false,
        website: services?.website || false,
        mobileApp: services?.mobileApp || false,
      },
      logo: logo || undefined,
      maxScreens: 1,
      maxDevices: 1,
      serviceEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // Issue token pair (access + refresh) with environment-aware HttpOnly cookies
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyName: user.companyName,
    };

    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Audit log: new registration
    logAudit('REGISTER', {
      userId: user._id.toString(),
      email: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res
      .cookie('aurify_token', accessToken, getTokenCookieOptions())
      .cookie('aurify_refresh', refreshToken, getRefreshCookieOptions())
      .status(201)
      .json({
        success: true,
        message: 'Account created successfully',
        token: accessToken, // also returned in body for backward compatibility
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

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Constant-time response: always return same message to prevent enumeration
      logSecurity('FAILED_LOGIN', { email, ipAddress: req.ip, path: req.path });
      res.status(401).json({ success: false, message: AUTH_FAIL_MESSAGE });
      return;
    }

    // Account status check
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
      return;
    }

    // Account lockout check
    if (isAccountLocked(user)) {
      logSecurity('ACCOUNT_LOCKED', {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: req.ip,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        message:
          'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.',
      });
      return;
    }

    // Password check
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordFailedLogin(user);
      logSecurity('FAILED_LOGIN', {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: req.ip,
        path: req.path,
      });
      res.status(401).json({ success: false, message: AUTH_FAIL_MESSAGE });
      return;
    }

    // Successful login — reset lockout counters
    await resetLoginAttempts(user);

    // Issue token pair
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyName: user.companyName,
    };

    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Audit log: successful login
    logAudit('LOGIN', {
      userId: user._id.toString(),
      email: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res
      .cookie('aurify_token', accessToken, getTokenCookieOptions())
      .cookie('aurify_refresh', refreshToken, getRefreshCookieOptions())
      .status(200)
      .json({
        success: true,
        message: 'Login successful',
        token: accessToken, // backward compat
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

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefresh = req.cookies?.aurify_refresh;
    if (!rawRefresh) {
      res.status(401).json({ success: false, message: 'No refresh token provided.' });
      return;
    }

    // Decode the current access token to get userId (may be expired — that's OK)
    const jwtModule = await import('jsonwebtoken');
    let userId: string;
    try {
      const payload = jwtModule.default.decode(req.cookies?.aurify_token || '') as {
        id?: string;
      } | null;
      userId = payload?.id || '';
    } catch {
      userId = '';
    }

    if (!userId) {
      logSecurity('INVALID_JWT', { ipAddress: req.ip, path: req.path });
      res.status(401).json({ success: false, message: 'Invalid session.' });
      return;
    }

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Session invalid.' });
      return;
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyName: user.companyName,
    };

    const { accessToken, refreshToken: newRefresh } = await rotateRefreshToken(
      rawRefresh,
      userId,
      tokenPayload,
      { userAgent: req.headers['user-agent'], ipAddress: req.ip }
    );

    res
      .cookie('aurify_token', accessToken, getTokenCookieOptions())
      .cookie('aurify_refresh', newRefresh, getRefreshCookieOptions())
      .status(200)
      .json({ success: true, token: accessToken });
  } catch (err: any) {
    if (err.message === 'Invalid or expired refresh token') {
      logSecurity('EXPIRED_JWT', { ipAddress: req.ip, path: req.path });
      res.status(401).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawRefresh = req.cookies?.aurify_refresh;
    if (rawRefresh) {
      try {
        await revokeSession(rawRefresh);
      } catch (sessionErr) {
        console.warn('[auth.controller] Error revoking session in DB:', sessionErr);
      }
    }
    const authReq = req as Request & { user?: { id: string; email?: string } };
    if (authReq.user?.id) {
      try {
        logAudit('LOGOUT', {
          userId: authReq.user?.id,
          email: authReq.user?.email,
          ipAddress: req.ip,
        });
      } catch (auditErr) {
        console.warn('[auth.controller] Error logging audit during logout:', auditErr);
      }
    }
    res
      .clearCookie('aurify_token', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      .clearCookie('aurify_refresh', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      .clearCookie('aurify_token')
      .clearCookie('aurify_refresh')
      .status(200)
      .json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res
      .clearCookie('aurify_token')
      .clearCookie('aurify_refresh')
      .status(200)
      .json({ success: true, message: 'Logged out.' });
  }
};

// ─── LOGOUT ALL DEVICES ───────────────────────────────────────────────────────
export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request & { user?: { id: string; email?: string } };
    if (authReq.user?.id) {
      await revokeAllSessions(authReq.user.id);
    }
    logAudit('LOGOUT_ALL', {
      userId: authReq.user?.id,
      email: authReq.user?.email,
      ipAddress: req.ip,
    });
    res
      .clearCookie('aurify_token')
      .clearCookie('aurify_refresh')
      .status(200)
      .json({ success: true, message: 'Logged out from all devices.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Request & { user?: { id: string } };
    const user = await User.findById(authReq.user?.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as Request & { user?: { id: string } };
    const { companyName, phone, currentPassword, newPassword } = req.body;

    const user = await User.findById(authReq.user?.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (companyName) user.companyName = companyName;
    if (phone) user.phone = phone;

    if (newPassword) {
      if (!currentPassword) {
        res
          .status(400)
          .json({ success: false, message: 'Current password is required to set a new password' });
        return;
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Incorrect current password' });
        return;
      }
      // Enforce password strength policy
      const passwordCheck = validatePasswordStrength(newPassword, user.email);
      if (!passwordCheck.valid) {
        res.status(422).json({ success: false, message: passwordCheck.message });
        return;
      }
      user.passwordHash = await bcrypt.hash(newPassword, 12);

      // Audit log: password change
      logAudit('PASSWORD_CHANGE', {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: req.ip,
      });
    }

    await user.save();

    // Sync linked Merchant profile
    if (companyName || phone) {
      await Merchant.findOneAndUpdate(
        { userId: user._id.toString() },
        {
          $set: {
            ...(companyName && { companyName }),
            ...(phone && { phone }),
          },
        }
      );
    }

    // Audit log: profile update
    logAudit('PROFILE_UPDATE', {
      userId: user._id.toString(),
      email: user.email,
      ipAddress: req.ip,
    });

    // Re-issue fresh access token
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyName: user.companyName,
    };
    const accessToken = issueAccessToken(tokenPayload);

    res
      .cookie('aurify_token', accessToken, getTokenCookieOptions())
      .status(200)
      .json({
        success: true,
        message: 'Profile updated successfully',
        token: accessToken,
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
