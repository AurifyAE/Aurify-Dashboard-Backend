'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const express_1 = require('express');
const auth_controller_1 = require('../controllers/auth.controller');
const auth_middleware_1 = require('../middlewares/auth.middleware');
const rateLimiter_middleware_1 = require('../middlewares/rateLimiter.middleware');
const validation_middleware_1 = require('../middlewares/validation.middleware');
const router = (0, express_1.Router)();
// POST /api/auth/register — throttled to 5 attempts/hour
router.post(
  '/register',
  rateLimiter_middleware_1.registerLimiter,
  (0, validation_middleware_1.validate)(validation_middleware_1.registerSchema),
  auth_controller_1.register
);
// POST /api/auth/login — throttled to 10 attempts/15 min
router.post(
  '/login',
  rateLimiter_middleware_1.authLimiter,
  (0, validation_middleware_1.validate)(validation_middleware_1.loginSchema),
  auth_controller_1.login
);
// POST /api/auth/refresh — rotate refresh token
router.post('/refresh', auth_controller_1.refreshToken);
// POST /api/auth/logout — revoke current device session
router.post('/logout', auth_middleware_1.protect, auth_controller_1.logout);
// POST /api/auth/logout-all — revoke all sessions (all devices)
router.post('/logout-all', auth_middleware_1.protect, auth_controller_1.logoutAll);
// GET /api/auth/me  (protected)
router.get('/me', auth_middleware_1.protect, auth_controller_1.getMe);
// PUT /api/auth/profile (protected)
router.put(
  '/profile',
  auth_middleware_1.protect,
  (0, validation_middleware_1.validate)(validation_middleware_1.updateProfileSchema),
  auth_controller_1.updateProfile
);
exports.default = router;
