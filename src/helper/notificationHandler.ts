import { NotificationEventBus, NotificationEvents } from './eventBus';
import { NotificationTemplates } from '../config/notification.templates';
import Notification from '../models/Notification';
import { getIoInstance } from '../sockets/socketService';

async function handleNotificationEvent(event: string, payload: any) {
  try {
    const { merchantId, actor } = payload;
    if (!merchantId) {
      console.warn(`[NotificationHandler] Missing merchantId for event ${event}`);
      return;
    }

    const templateFn = NotificationTemplates[event as keyof typeof NotificationTemplates];
    if (!templateFn) {
      console.warn(`[NotificationHandler] No template function registered for event: ${event}`);
      return;
    }

    const template = templateFn(payload);

    // --- Deduplication Check ---
    // Look for an existing unread notification of the same category and title for this merchant
    // created within the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingNotif = await Notification.findOne({
      merchantId,
      category: template.category,
      title: template.title,
      readAt: null,
      clearedAt: null,
      createdAt: { $gte: oneHourAgo },
    });

    let notification;
    if (existingNotif) {
      // Update existing notification to prevent spamming the client dropdown
      existingNotif.message = template.message;
      existingNotif.actor = {
        id: actor?.id || 'system',
        name: actor?.name || 'System',
        type: actor?.type || 'system',
      };
      existingNotif.actions = template.actions;
      existingNotif.expiresAt = template.expiresAt;
      existingNotif.isPinned = template.isPinned ?? existingNotif.isPinned;
      existingNotif.metadata = { ...(existingNotif.metadata || {}), ...payload.metadata };
      // Push timestamp update to bubble it up to top of Today list
      existingNotif.createdAt = new Date();
      notification = await existingNotif.save();
      console.log(`[NotificationHandler] Deduplicated & updated existing unread notification: ${notification._id}`);
    } else {
      // Create new notification document
      notification = await Notification.create({
        merchantId,
        title: template.title,
        message: template.message,
        type: template.type,
        priority: template.priority || 'NORMAL',
        category: template.category,
        sourceModule: template.sourceModule,
        version: 1,
        silent: template.silent ?? false,
        isPinned: template.isPinned ?? false,
        iconKey: template.iconKey,
        actor: {
          id: actor?.id || 'system',
          name: actor?.name || 'System',
          type: actor?.type || 'system',
        },
        actions: template.actions,
        readAt: null,
        clearedAt: null,
        expiresAt: template.expiresAt,
        scheduledFor: template.scheduledFor,
        metadata: payload.metadata,
      });
      console.log(`[NotificationHandler] Created new notification: ${notification._id}`);
    }

    // --- Calculate Unread Count & Emit Socket Event ---
    const unreadCount = await Notification.countDocuments({
      merchantId,
      readAt: null,
      clearedAt: null,
    });

    const io = getIoInstance();
    if (io) {
      const room = `merchant:${merchantId}`;
      io.to(room).emit('notification:new', {
        notification,
        unreadCount,
      });
      console.log(`[NotificationHandler] Emitted notification:new event to room: ${room}`);
    } else {
      console.log(`[NotificationHandler] Socket server reference not set; could not emit notification:new in real-time`);
    }
  } catch (err) {
    console.error(`[NotificationHandler] Failed to handle notification event: ${event}`, err);
  }
}

// Subscribe to all business events
Object.values(NotificationEvents).forEach((event) => {
  NotificationEventBus.subscribe(event, (payload: any) => {
    handleNotificationEvent(event, payload);
  });
});
