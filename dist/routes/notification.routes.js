"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect all notification routes
router.use(auth_middleware_1.protect);
router.get('/', notification_controller_1.getNotifications);
router.get('/unread-count', notification_controller_1.getUnreadCount);
router.patch('/read-all', notification_controller_1.readAllNotifications);
router.patch('/clear-all', notification_controller_1.clearAllNotifications);
router.patch('/clear-all-read', notification_controller_1.clearAllReadNotifications);
router.patch('/clear-selected', notification_controller_1.clearSelectedNotifications);
router.patch('/:id/read', notification_controller_1.markAsRead);
router.patch('/:id/clear', notification_controller_1.clearNotification);
router.delete('/:id', notification_controller_1.deleteNotification);
exports.default = router;
