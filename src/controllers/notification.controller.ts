import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Notification from '../models/Notification';
import Merchant from '../models/Merchant';

const getMerchantId = async (req: AuthRequest): Promise<string | null> => {
  if (!req.user?.id) return null;
  const merchant = await Merchant.findOne({ userId: req.user.id }).lean();
  return merchant ? merchant.merchantId : null;
};

// GET /api/notifications?page=1&pageSize=20&category=APPROVAL&unread=true
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const category = req.query.category as string;
    const unreadOnly = req.query.unread === 'true';

    const filter: Record<string, any> = {
      merchantId,
      clearedAt: null,
    };

    if (category) {
      filter.category = category;
    }

    if (unreadOnly) {
      filter.readAt = null;
    }

    const total = await Notification.countDocuments(filter);

    // Calculate unread count specifically for active notifications
    const unread = await Notification.countDocuments({
      merchantId,
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

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      merchantId,
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
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, merchantId },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      merchantId,
      readAt: null,
      clearedAt: null,
    });

    res.status(200).json({ success: true, data: { notification, unread } });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

// PATCH /api/notifications/read-all
export const readAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    await Notification.updateMany(
      { merchantId, readAt: null, clearedAt: null },
      { $set: { readAt: new Date() } }
    );

    res.status(200).json({ success: true, data: { unread: 0 } });
  } catch (err) {
    console.error('readAllNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// PATCH /api/notifications/:id/clear
export const clearNotification = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, merchantId },
      { $set: { clearedAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      merchantId,
      readAt: null,
      clearedAt: null,
    });

    res.status(200).json({ success: true, data: { notification, unread } });
  } catch (err) {
    console.error('clearNotification error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear notification' });
  }
};

// PATCH /api/notifications/clear-all-read
export const clearAllReadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    await Notification.updateMany(
      { merchantId, readAt: { $ne: null }, clearedAt: null },
      { $set: { clearedAt: new Date() } }
    );

    res.status(200).json({ success: true, message: 'Cleared all read notifications' });
  } catch (err) {
    console.error('clearAllReadNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear read notifications' });
  }
};

// PATCH /api/notifications/clear-selected
export const clearSelectedNotifications = async (req: AuthRequest, res: Response) => {
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

    await Notification.updateMany(
      { _id: { $in: ids }, merchantId },
      { $set: { clearedAt: new Date() } }
    );

    const unread = await Notification.countDocuments({
      merchantId,
      readAt: null,
      clearedAt: null,
    });

    res.status(200).json({ success: true, data: { unread } });
  } catch (err) {
    console.error('clearSelectedNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear selected notifications' });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = await getMerchantId(req);
    if (!merchantId) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({ _id: id, merchantId });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const unread = await Notification.countDocuments({
      merchantId,
      readAt: null,
      clearedAt: null,
    });

    res.status(200).json({ success: true, data: { unread } });
  } catch (err) {
    console.error('deleteNotification error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};
