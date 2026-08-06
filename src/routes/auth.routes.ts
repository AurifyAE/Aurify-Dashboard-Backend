import { Router } from 'express';
import { register, login, getMe, updateProfile, refreshToken, logout, logoutAll } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { authLimiter, registerLimiter } from '../middlewares/rateLimiter.middleware';
import { validate, loginSchema, registerSchema, updateProfileSchema } from '../middlewares/validation.middleware';

const router = Router();

// POST /api/auth/register — throttled to 5 attempts/hour
router.post('/register', registerLimiter, validate(registerSchema), register);

// POST /api/auth/login — throttled to 10 attempts/15 min
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /api/auth/refresh — rotate refresh token
router.post('/refresh', refreshToken);

// POST /api/auth/logout — revoke current device session
router.post('/logout', protect, logout);

// POST /api/auth/logout-all — revoke all sessions (all devices)
router.post('/logout-all', protect, logoutAll);

// GET /api/auth/me  (protected)
router.get('/me', protect, getMe);

// PUT /api/auth/profile (protected)
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);

export default router;
