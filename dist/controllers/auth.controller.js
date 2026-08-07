'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.updateProfile =
  exports.getMe =
  exports.logoutAll =
  exports.logout =
  exports.refreshToken =
  exports.login =
  exports.register =
    void 0;
const bcryptjs_1 = __importDefault(require('bcryptjs'));
const User_1 = __importDefault(require('../models/User'));
const Merchant_1 = __importDefault(require('../models/Merchant'));
const auth_service_1 = require('../services/auth.service');
const token_service_1 = require('../services/token.service');
const audit_service_1 = require('../services/audit.service');
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
const merchantIdFromUser = (userId) => `m_${userId}`;
// ─── REGISTER ────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // Joi validation middleware already validated the shape.
    const { companyName, email, phone, password, logo, services } = req.body;
    // Password strength (with email check)
    const passwordCheck = (0, auth_service_1.validatePasswordStrength)(password, email);
    if (!passwordCheck.valid) {
      res.status(422).json({ success: false, errors: { password: passwordCheck.message } });
      return;
    }
    // Check duplicate email
    const existing = await User_1.default.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        errors: { email: 'An account with this email already exists' },
      });
      return;
    }
    // Hash password
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    // Create user
    const user = await User_1.default.create({
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
    while (await Merchant_1.default.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }
    // Create merchant profile immediately
    await Merchant_1.default.create({
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
    const { accessToken, refreshToken } = await (0, token_service_1.generateTokenPair)(
      tokenPayload,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      }
    );
    // Audit log: new registration
    (0, audit_service_1.logAudit)('REGISTER', {
      userId: user._id.toString(),
      email: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res
      .cookie('aurify_token', accessToken, (0, auth_service_1.getTokenCookieOptions)())
      .cookie('aurify_refresh', refreshToken, (0, auth_service_1.getRefreshCookieOptions)())
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
exports.register = register;
// ─── LOGIN ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Find user
    const user = await User_1.default.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Constant-time response: always return same message to prevent enumeration
      (0, audit_service_1.logSecurity)('FAILED_LOGIN', {
        email,
        ipAddress: req.ip,
        path: req.path,
      });
      res.status(401).json({ success: false, message: auth_service_1.AUTH_FAIL_MESSAGE });
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
    if ((0, auth_service_1.isAccountLocked)(user)) {
      (0, audit_service_1.logSecurity)('ACCOUNT_LOCKED', {
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
      await (0, auth_service_1.recordFailedLogin)(user);
      (0, audit_service_1.logSecurity)('FAILED_LOGIN', {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: req.ip,
        path: req.path,
      });
      res.status(401).json({ success: false, message: auth_service_1.AUTH_FAIL_MESSAGE });
      return;
    }
    // Successful login — reset lockout counters
    await (0, auth_service_1.resetLoginAttempts)(user);
    // Issue token pair
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyName: user.companyName,
    };
    const { accessToken, refreshToken } = await (0, token_service_1.generateTokenPair)(
      tokenPayload,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      }
    );
    // Audit log: successful login
    (0, audit_service_1.logAudit)('LOGIN', {
      userId: user._id.toString(),
      email: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res
      .cookie('aurify_token', accessToken, (0, auth_service_1.getTokenCookieOptions)())
      .cookie('aurify_refresh', refreshToken, (0, auth_service_1.getRefreshCookieOptions)())
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
exports.login = login;
// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const rawRefresh = req.cookies?.aurify_refresh;
    if (!rawRefresh) {
      res.status(401).json({ success: false, message: 'No refresh token provided.' });
      return;
    }
    // Decode the current access token to get userId (may be expired — that's OK)
    const jwtModule = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
    let userId;
    try {
      const payload = jwtModule.default.decode(req.cookies?.aurify_token || '');
      userId = payload?.id || '';
    } catch {
      userId = '';
    }
    if (!userId) {
      (0, audit_service_1.logSecurity)('INVALID_JWT', { ipAddress: req.ip, path: req.path });
      res.status(401).json({ success: false, message: 'Invalid session.' });
      return;
    }
    const user = await User_1.default.findById(userId);
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
    const { accessToken, refreshToken: newRefresh } = await (0, token_service_1.rotateRefreshToken)(
      rawRefresh,
      userId,
      tokenPayload,
      { userAgent: req.headers['user-agent'], ipAddress: req.ip }
    );
    res
      .cookie('aurify_token', accessToken, (0, auth_service_1.getTokenCookieOptions)())
      .cookie('aurify_refresh', newRefresh, (0, auth_service_1.getRefreshCookieOptions)())
      .status(200)
      .json({ success: true, token: accessToken });
  } catch (err) {
    if (err.message === 'Invalid or expired refresh token') {
      (0, audit_service_1.logSecurity)('EXPIRED_JWT', { ipAddress: req.ip, path: req.path });
      res.status(401).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};
exports.refreshToken = refreshToken;
// ─── LOGOUT ───────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const rawRefresh = req.cookies?.aurify_refresh;
    if (rawRefresh) {
      try {
        await (0, token_service_1.revokeSession)(rawRefresh);
      } catch (sessionErr) {
        console.warn('[auth.controller] Error revoking session in DB:', sessionErr);
      }
    }
    const authReq = req;
    if (authReq.user?.id) {
      try {
        (0, audit_service_1.logAudit)('LOGOUT', {
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
exports.logout = logout;
// ─── LOGOUT ALL DEVICES ───────────────────────────────────────────────────────
const logoutAll = async (req, res, next) => {
  try {
    const authReq = req;
    if (authReq.user?.id) {
      await (0, token_service_1.revokeAllSessions)(authReq.user.id);
    }
    (0, audit_service_1.logAudit)('LOGOUT_ALL', {
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
exports.logoutAll = logoutAll;
// ─── GET ME ───────────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const authReq = req;
    const user = await User_1.default.findById(authReq.user?.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
exports.getMe = getMe;
// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const authReq = req;
    const { companyName, phone, currentPassword, newPassword } = req.body;
    const user = await User_1.default.findById(authReq.user?.id);
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
      const passwordCheck = (0, auth_service_1.validatePasswordStrength)(newPassword, user.email);
      if (!passwordCheck.valid) {
        res.status(422).json({ success: false, message: passwordCheck.message });
        return;
      }
      user.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
      // Audit log: password change
      (0, audit_service_1.logAudit)('PASSWORD_CHANGE', {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: req.ip,
      });
    }
    await user.save();
    // Sync linked Merchant profile
    if (companyName || phone) {
      await Merchant_1.default.findOneAndUpdate(
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
    (0, audit_service_1.logAudit)('PROFILE_UPDATE', {
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
    const accessToken = (0, token_service_1.issueAccessToken)(tokenPayload);
    res
      .cookie('aurify_token', accessToken, (0, auth_service_1.getTokenCookieOptions)())
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
exports.updateProfile = updateProfile;
