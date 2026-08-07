'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.updateProfileSchema =
  exports.loginSchema =
  exports.registerSchema =
  exports.validate =
    void 0;
const joi_1 = __importDefault(require('joi'));
// ─── Generic schema validator factory ────────────────────────────────────────
/**
 * Returns an Express middleware that validates req.body against the provided
 * Joi schema.  On failure it returns 422 with structured field errors.
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // collect all errors, not just the first
      stripUnknown: true, // remove fields not in schema (prevent mass-assign)
    });
    if (error) {
      const errors = {};
      error.details.forEach((d) => {
        const key = d.path.join('.');
        errors[key] = d.message.replace(/['"]/g, '');
      });
      res.status(422).json({ success: false, errors });
      return;
    }
    // Replace body with the sanitised, validated value
    req.body = value;
    next();
  };
};
exports.validate = validate;
// ─── Common password policy ───────────────────────────────────────────────────
// 10+ chars, must include uppercase, lowercase, number, special character.
// Also rejects a short list of common weak passwords.
const COMMON_PASSWORDS = [
  'Password123!',
  'Welcome@123',
  'Qwerty@123',
  'Admin@1234',
  'P@ssword1',
  'Passw0rd!',
];
const passwordSchema = joi_1.default
  .string()
  .min(10)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/[0-9]/, 'number')
  .pattern(/[^A-Za-z0-9]/, 'special character')
  .custom((value, helpers) => {
    if (COMMON_PASSWORDS.includes(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'string.min': 'Password must be at least 10 characters',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.name': 'Password must contain at least one {#name}',
    'any.invalid': 'This password is too common. Please choose a stronger password.',
    'any.required': 'Password is required',
  });
// ─── Auth Schemas ─────────────────────────────────────────────────────────────
exports.registerSchema = joi_1.default.object({
  companyName: joi_1.default.string().trim().min(2).max(100).required().messages({
    'string.min': 'Company name must be at least 2 characters',
    'any.required': 'Company name is required',
  }),
  email: joi_1.default.string().trim().email().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  phone: joi_1.default
    .string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required',
    }),
  password: passwordSchema.required(),
  confirmPassword: joi_1.default.string().valid(joi_1.default.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
  logo: joi_1.default.string().optional().allow('', null),
  services: joi_1.default
    .object({
      tvDisplay: joi_1.default.boolean().default(false),
      website: joi_1.default.boolean().default(false),
      mobileApp: joi_1.default.boolean().default(false),
    })
    .optional(),
});
exports.loginSchema = joi_1.default.object({
  email: joi_1.default.string().trim().required().messages({
    'any.required': 'Email or username is required',
  }),
  password: joi_1.default.string().required().messages({
    'any.required': 'Password is required',
  }),
});
exports.updateProfileSchema = joi_1.default.object({
  companyName: joi_1.default.string().trim().min(2).max(100).optional(),
  phone: joi_1.default
    .string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Please provide a valid phone number' }),
  currentPassword: joi_1.default.string().when('newPassword', {
    is: joi_1.default.exist(),
    then: joi_1.default.required().messages({
      'any.required': 'Current password is required to set a new password',
    }),
    otherwise: joi_1.default.optional(),
  }),
  newPassword: passwordSchema.optional(),
});
