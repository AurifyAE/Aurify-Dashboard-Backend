"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.clearSelectedNotifications = exports.clearAllNotifications = exports.clearAllReadNotifications = exports.clearNotification = exports.readAllNotifications = exports.markAsRead = exports.getUnreadCount = exports.syncNotifications = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const socketService_1 = require("../sockets/socketService");
// Helper to resolve user ID safely from request
const getUserId = (req) => {
    return req.user?.id || null;
};
// GET /api/notifications?page=1&pageSize=20&category=APPROVAL&unread=true
const getNotifications = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const category = req.query.category;
        const unreadOnly = req.query.unread === 'true';
        // Auto-delete read notifications that are older than 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        await Notification_1.default.deleteMany({
            recipientUserId: userId,
            readAt: { $ne: null, $lt: ninetyDaysAgo },
        });
        const filter = {
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            clearedAt: null,
            $or: [{ readAt: null }, { readAt: { $gte: ninetyDaysAgo } }],
        };
        if (category)
            filter.category = category;
        if (unreadOnly)
            filter.readAt = null;
        const total = await Notification_1.default.countDocuments(filter);
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
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
// GET /api/notifications/sync?cursor=<createdAt_id>
const syncNotifications = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const cursor = req.query.cursor;
        let afterDate = new Date(0);
        if (cursor) {
            const parts = cursor.split('_');
            const datePart = parts[0];
            if (datePart && !isNaN(Date.parse(datePart))) {
                afterDate = new Date(datePart);
            }
        }
        // Delta notifications created after cursor
        const deltaNotifications = await Notification_1.default.find({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            clearedAt: null,
            createdAt: { $gt: afterDate },
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        // Authoritative unread count
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
        });
        // Authoritative active read notification IDs for state reconciliation
        const activeReadDocs = await Notification_1.default.find({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: { $ne: null },
            clearedAt: null,
        })
            .select('_id')
            .lean();
        const activeReadIds = activeReadDocs.map((doc) => doc._id.toString());
        res.status(200).json({
            success: true,
            data: {
                deltaNotifications,
                unread,
                activeReadIds,
                syncedAt: new Date(),
            },
        });
    }
    catch (err) {
        console.error('syncNotifications error:', err);
        res.status(500).json({ success: false, message: 'Failed to sync notifications' });
    }
};
exports.syncNotifications = syncNotifications;
// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, recipientUserId: userId }, { $set: { readAt: new Date() } }, { new: true });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
        });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'read',
                notificationId: id,
                unreadCount: unread,
            });
        }
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        await Notification_1.default.updateMany({ recipientUserId: userId, notificationStatus: 'ACTIVE', readAt: null, clearedAt: null }, { $set: { readAt: new Date() } });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'all-read',
                unreadCount: 0,
            });
        }
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, recipientUserId: userId }, { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } }, { new: true });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
        });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'cleared',
                notificationId: id,
                unreadCount: unread,
            });
        }
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        await Notification_1.default.updateMany({ recipientUserId: userId, notificationStatus: 'ACTIVE', readAt: { $ne: null }, clearedAt: null }, { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } });
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
        });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'cleared-read',
                unreadCount: unread,
            });
        }
        res.status(200).json({ success: true, message: 'Cleared all read notifications', data: { unread } });
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        await Notification_1.default.updateMany({ recipientUserId: userId, clearedAt: null }, { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'all-cleared',
                unreadCount: 0,
            });
        }
        res.status(200).json({ success: true, message: 'Cleared all notifications', data: { unread: 0 } });
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            res.status(400).json({ success: false, message: 'Invalid format. Expected ids array.' });
            return;
        }
        await Notification_1.default.updateMany({ _id: { $in: ids }, recipientUserId: userId }, { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } });
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
        });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'cleared-selected',
                notificationIds: ids,
                unreadCount: unread,
            });
        }
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
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const notification = await Notification_1.default.findOneAndDelete({ _id: id, recipientUserId: userId });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        const unread = await Notification_1.default.countDocuments({
            recipientUserId: userId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
        });
        // Multi-tab socket sync event
        const io = (0, socketService_1.getIoInstance)();
        if (io) {
            io.to(`user:${userId}`).emit('notification:state-change', {
                type: 'deleted',
                notificationId: id,
                unreadCount: unread,
            });
        }
        res.status(200).json({ success: true, data: { unread } });
    }
    catch (err) {
        console.error('deleteNotification error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};
exports.deleteNotification = deleteNotification;
