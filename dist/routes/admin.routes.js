"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Only allow super_admin and admin
router.use(auth_middleware_1.protect, (0, auth_middleware_1.requireRole)('super_admin', 'admin'));
// /api/admin/users
router.get('/users', admin_controller_1.getMerchants);
router.patch('/users/:id', admin_controller_1.updateMerchant);
router.delete('/users/:id', admin_controller_1.deleteMerchant);
router.post('/users/:id/reset-password', admin_controller_1.adminResetPassword);
exports.default = router;
