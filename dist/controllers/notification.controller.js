"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.clearSelectedNotifications = exports.clearAllNotifications = exports.clearAllReadNotifications = exports.clearNotification = exports.readAllNotifications = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const Merchant_1 = __importDefault(require("../models/Merchant"));
const getMerchantId = async (req) => {
    if (!req.user?.id)
        return null;
    const merchant = await Merchant_1.default.findOne({ userId: req.user.id }).lean();
    return merchant ? merchant.merchantId : null;
};
// GET /api/notifications?page=1&pageSize=20&category=APPROVAL&unread=true
const getNotifications = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const category = req.query.category;
        const unreadOnly = req.query.unread === 'true';
        // Auto-delete read notifications that are older than 90 days after being read
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        await Notification_1.default.deleteMany({
            merchantId,
            readAt: { $ne: null, $lt: ninetyDaysAgo },
        });
        const filter = {
            merchantId,
            clearedAt: null,
            $or: [{ readAt: null }, { readAt: { $gte: ninetyDaysAgo } }],
        };
        if (category) {
            filter.category = category;
        }
        if (unreadOnly) {
            filter.readAt = null;
        }
        const total = await Notification_1.default.countDocuments(filter);
        // Calculate unread count specifically for active notifications
        const unread = await Notification_1.default.countDocuments({
            merchantId,
            readAt: null,
            clearedAt: null,
        });
        const notifications = await Notification_1.default.find(filter)
            .sort({ isPinned: -1, createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean();
        const hasMore = page * pageSize < total;
        res.status(200).json({
            success: true,
            data: {
                notifications,
                page,
                pageSize,
                total,
                unread,
                hasMore,
            },
        });
    }
    catch (err) {
        console.error('getNotifications error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};
exports.getNotifications = getNotifications;
// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            merchantId,
            readAt: null,
            clearedAt: null,
        });
        res.status(200).json({ success: true, data: { unread } });
    }
    catch (err) {
        console.error('getUnreadCount error:', err);
        res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
};
exports.getUnreadCount = getUnreadCount;
// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        const { id } = req.params;
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, merchantId }, { $set: { readAt: new Date() } }, { new: true });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            merchantId,
            readAt: null,
            clearedAt: null,
        });
        res.status(200).json({ success: true, data: { notification, unread } });
    }
    catch (err) {
        console.error('markAsRead error:', err);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};
exports.markAsRead = markAsRead;
// PATCH /api/notifications/read-all
const readAllNotifications = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        await Notification_1.default.updateMany({ merchantId, readAt: null, clearedAt: null }, { $set: { readAt: new Date() } });
        res.status(200).json({ success: true, data: { unread: 0 } });
    }
    catch (err) {
        console.error('readAllNotifications error:', err);
        res.status(500).json({ success: false, message: 'Failed to mark all as read' });
    }
};
exports.readAllNotifications = readAllNotifications;
// PATCH /api/notifications/:id/clear
const clearNotification = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        const { id } = req.params;
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, merchantId }, { $set: { clearedAt: new Date() } }, { new: true });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            merchantId,
            readAt: null,
            clearedAt: null,
        });
        res.status(200).json({ success: true, data: { notification, unread } });
    }
    catch (err) {
        console.error('clearNotification error:', err);
        res.status(500).json({ success: false, message: 'Failed to clear notification' });
    }
};
exports.clearNotification = clearNotification;
// PATCH /api/notifications/clear-all-read
const clearAllReadNotifications = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        await Notification_1.default.updateMany({ merchantId, readAt: { $ne: null }, clearedAt: null }, { $set: { clearedAt: new Date() } });
        res.status(200).json({ success: true, message: 'Cleared all read notifications' });
    }
    catch (err) {
        console.error('clearAllReadNotifications error:', err);
        res.status(500).json({ success: false, message: 'Failed to clear read notifications' });
    }
};
exports.clearAllReadNotifications = clearAllReadNotifications;
// PATCH /api/notifications/clear-all
const clearAllNotifications = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        await Notification_1.default.updateMany({ merchantId, clearedAt: null }, { $set: { clearedAt: new Date() } });
        res
            .status(200)
            .json({ success: true, message: 'Cleared all notifications', data: { unread: 0 } });
    }
    catch (err) {
        console.error('clearAllNotifications error:', err);
        res.status(500).json({ success: false, message: 'Failed to clear notifications' });
    }
};
exports.clearAllNotifications = clearAllNotifications;
// PATCH /api/notifications/clear-selected
const clearSelectedNotifications = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            res.status(400).json({ success: false, message: 'Invalid format. Expected ids array.' });
            return;
        }
        await Notification_1.default.updateMany({ _id: { $in: ids }, merchantId }, { $set: { clearedAt: new Date() } });
        const unread = await Notification_1.default.countDocuments({
            merchantId,
            readAt: null,
            clearedAt: null,
        });
        res.status(200).json({ success: true, data: { unread } });
    }
    catch (err) {
        console.error('clearSelectedNotifications error:', err);
        res.status(500).json({ success: false, message: 'Failed to clear selected notifications' });
    }
};
exports.clearSelectedNotifications = clearSelectedNotifications;
// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
    try {
        const merchantId = await getMerchantId(req);
        if (!merchantId) {
            res.status(404).json({ success: false, message: 'Merchant not found' });
            return;
        }
        const { id } = req.params;
        const notification = await Notification_1.default.findOneAndDelete({ _id: id, merchantId });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            merchantId,
            readAt: null,
            clearedAt: null,
        });
        res.status(200).json({ success: true, data: { unread } });
    }
    catch (err) {
        console.error('deleteNotification error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};
exports.deleteNotification = deleteNotification;
