'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require('jsonwebtoken'));
const bcryptjs_1 = __importDefault(require('bcryptjs'));
const User_1 = __importDefault(require('../models/User'));
const Merchant_1 = __importDefault(require('../models/Merchant'));
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
const merchantIdFromUser = (userId) => `m_${userId}`;
const signToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
// ─── REGISTER ───────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { companyName, email, phone, password, confirmPassword, logo, services } = req.body;
    // --- Validation ---
    const errors = {};
    if (!companyName?.trim()) errors.companyName = 'Company name is required';
    if (!email?.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Invalid email format';
    if (!phone?.trim()) errors.phone = 'Phone number is required';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (Object.keys(errors).length > 0) {
      res.status(422).json({ success: false, errors });
      return;
    }
    // --- Check duplicate email ---
    const existing = await User_1.default.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        errors: { email: 'An account with this email already exists' },
      });
      return;
    }
    // --- Hash password ---
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    // --- Create user ---
    const user = await User_1.default.create({
      companyName: companyName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      passwordHash,
      role: 'user',
      status: 'active',
    });
    // --- Generate slug and merchantId ---
    const baseSlug = slugify(companyName || email);
    let slug = baseSlug || `merchant-${Date.now()}`;
    let suffix = 1;
    while (await Merchant_1.default.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }
    // --- Create merchant profile immediately ---
    await Merchant_1.default.create({
      merchantId: merchantIdFromUser(user._id.toString()),
      userId: user._id.toString(),
      companyName: companyName.trim(),
      slug,
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      status: 'Pending', // Default status, requires admin approval
      services: {
        tvDisplay: services?.tvDisplay || false,
        website: services?.website || false,
        mobileApp: services?.mobileApp || false,
      },
      logo: logo || undefined, // Store base64 image if provided
      maxScreens: 1, // Default limit
      maxDevices: 1, // Default limit
      serviceEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
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
      message: 'Account created successfully',
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
exports.register = register;
// ─── LOGIN ───────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // --- Validation ---
    const errors = {};
    if (!email?.trim()) errors.email = 'Email/Username is required';
    else if (email.trim().toLowerCase() !== 'admin' && !/^\S+@\S+\.\S+$/.test(email))
      errors.email = 'Invalid email format';
    if (!password) errors.password = 'Password is required';
    if (Object.keys(errors).length > 0) {
      res.status(422).json({ success: false, errors });
      return;
    }
    // --- Find user ---
    const user = await User_1.default.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }
    // --- Check status ---
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
      return;
    }
    // --- Check password ---
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
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
      message: 'Login successful',
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
exports.login = login;
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
// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
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
      if (newPassword.length < 8) {
        res
          .status(400)
          .json({ success: false, message: 'New password must be at least 8 characters' });
        return;
      }
      user.passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    }
    await user.save();
    // Optionally update the linked Merchant profile's company name & phone
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
    // Re-issue token in case companyName changed
    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
    });
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
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
exports.updateProfile = updateProfile;
