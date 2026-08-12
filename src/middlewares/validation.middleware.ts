import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// ─── Generic schema validator factory ────────────────────────────────────────
/**
 * Returns an Express middleware that validates req.body against the provided
 * Joi schema.  On failure it returns 422 with structured field errors.
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // collect all errors, not just the first
      stripUnknown: true, // remove fields not in schema (prevent mass-assign)
    });

    if (error) {
      const errors: Record<string, string> = {};
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

const passwordSchema = Joi.string()
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

export const registerSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Company name must be at least 2 characters',
    'any.required': 'Company name is required',
  }),
  email: Joi.string().trim().email().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required',
    }),
  password: passwordSchema.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
  logo: Joi.string().optional().allow('', null),
  services: Joi.object({
    tvDisplay: Joi.boolean().default(false),
    website: Joi.boolean().default(false),
    mobileApp: Joi.boolean().default(false),
  }).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().required().messages({
    'any.required': 'Email or username is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const updateProfileSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Please provide a valid phone number' }),
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required().messages({
      'any.required': 'Current password is required to set a new password',
    }),
    otherwise: Joi.optional(),
  }),
  newPassword: passwordSchema.optional(),
});
