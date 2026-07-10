import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  readAllNotifications,
  clearNotification,
  clearAllReadNotifications,
  clearSelectedNotifications,
  deleteNotification,
} from '../controllers/notification.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Protect all notification routes
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', readAllNotifications);
router.patch('/clear-all-read', clearAllReadNotifications);
router.patch('/clear-selected', clearSelectedNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/:id/clear', clearNotification);
router.delete('/:id', deleteNotification);

export default router;
