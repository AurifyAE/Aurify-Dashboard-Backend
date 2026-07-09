"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// POST /api/auth/register
router.post('/register', auth_controller_1.register);
// POST /api/auth/login
router.post('/login', auth_controller_1.login);
// GET /api/auth/me  (protected)
router.get('/me', auth_middleware_1.protect, auth_controller_1.getMe);
// PUT /api/auth/profile (protected)
router.put('/profile', auth_middleware_1.protect, auth_controller_1.updateProfile);
exports.default = router;
