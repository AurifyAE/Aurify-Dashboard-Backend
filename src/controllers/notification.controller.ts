import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Notification from '../models/Notification';
import Merchant from '../models/Merchant';
import { getIoInstance } from '../sockets/socketService';

// Helper to resolve user ID safely from request
const getUserId = (req: AuthRequest): string | null => {
  return req.user?.id || null;
};

// GET /api/notifications?page=1&pageSize=20&category=APPROVAL&unread=true
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const category = req.query.category as string;
    const unreadOnly = req.query.unread === 'true';

    // Auto-delete read notifications that are older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({
      recipientUserId: userId,
      readAt: { $ne: null, $lt: ninetyDaysAgo },
    });

    const filter: Record<string, any> = {
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      clearedAt: null,
      $or: [{ readAt: null }, { readAt: { $gte: ninetyDaysAgo } }],
    };

    if (category) filter.category = category;
    if (unreadOnly) filter.readAt = null;

    const total = await Notification.countDocuments(filter);
    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    const notifications = await Notification.find(filter)
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
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// GET /api/notifications/sync?cursor=<createdAt_id>
export const syncNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const cursor = req.query.cursor as string | undefined;
    let afterDate = new Date(0);

    if (cursor) {
      const parts = cursor.split('_');
      const datePart = parts[0];
      if (datePart && !isNaN(Date.parse(datePart))) {
        afterDate = new Date(datePart);
      }
    }

    // Delta notifications created after cursor
    const deltaNotifications = await Notification.find({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      clearedAt: null,
      createdAt: { $gt: afterDate },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Authoritative unread count
    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    // Authoritative active read notification IDs for state reconciliation
    const activeReadDocs = await Notification.find({
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
  } catch (err) {
    console.error('syncNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to sync notifications' });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    res.status(200).json({ success: true, data: { unread } });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientUserId: userId },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'read',
        notificationId: id,
        unreadCount: unread,
      });
    }

    res.status(200).json({ success: true, data: { notification, unread } });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

// PATCH /api/notifications/read-all
export const readAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await Notification.updateMany(
      { recipientUserId: userId, notificationStatus: 'ACTIVE', readAt: null, clearedAt: null },
      { $set: { readAt: new Date() } }
    );

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'all-read',
        unreadCount: 0,
      });
    }

    res.status(200).json({ success: true, data: { unread: 0 } });
  } catch (err) {
    console.error('readAllNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// PATCH /api/notifications/:id/clear
export const clearNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientUserId: userId },
      { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'cleared',
        notificationId: id,
        unreadCount: unread,
      });
    }

    res.status(200).json({ success: true, data: { notification, unread } });
  } catch (err) {
    console.error('clearNotification error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear notification' });
  }
};

// PATCH /api/notifications/clear-all-read
export const clearAllReadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await Notification.updateMany(
      { recipientUserId: userId, notificationStatus: 'ACTIVE', readAt: { $ne: null }, clearedAt: null },
      { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } }
    );

    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'cleared-read',
        unreadCount: unread,
      });
    }

    res.status(200).json({ success: true, message: 'Cleared all read notifications', data: { unread } });
  } catch (err) {
    console.error('clearAllReadNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear read notifications' });
  }
};

// PATCH /api/notifications/clear-all
export const clearAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await Notification.updateMany(
      { recipientUserId: userId, clearedAt: null },
      { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } }
    );

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'all-cleared',
        unreadCount: 0,
      });
    }

    res.status(200).json({ success: true, message: 'Cleared all notifications', data: { unread: 0 } });
  } catch (err) {
    console.error('clearAllNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
};

// PATCH /api/notifications/clear-selected
export const clearSelectedNotifications = async (req: AuthRequest, res: Response) => {
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

    await Notification.updateMany(
      { _id: { $in: ids }, recipientUserId: userId },
      { $set: { notificationStatus: 'CLEARED', clearedAt: new Date() } }
    );

    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'cleared-selected',
        notificationIds: ids,
        unreadCount: unread,
      });
    }

    res.status(200).json({ success: true, data: { unread } });
  } catch (err) {
    console.error('clearSelectedNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear selected notifications' });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({ _id: id, recipientUserId: userId });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      recipientUserId: userId,
      notificationStatus: 'ACTIVE',
      readAt: null,
      clearedAt: null,
    });

    // Multi-tab socket sync event
    const io = getIoInstance();
    if (io) {
      io.to(`user:${userId}`).emit('notification:state-change', {
        type: 'deleted',
        notificationId: id,
        unreadCount: unread,
      });
    }

    res.status(200).json({ success: true, data: { unread } });
  } catch (err) {
    console.error('deleteNotification error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};
