import {
  NotificationEventBus,
  NotificationEvents,
  getEventPolicy,
  BusinessEventEnvelope,
} from './eventBus';
import { NotificationTemplates } from '../config/notification.templates';
import Notification, { INotification } from '../models/Notification';
import EventProcessing from '../models/EventProcessing';
import User from '../models/User';
import Merchant from '../models/Merchant';
import { getIoInstance } from '../sockets/socketService';
import { logAudit } from '../services/audit.service';

const EVENT_PROCESSING_LOCK_TIMEOUT_MS = 30_000;
const RETRY_BACKOFF_SCHEDULE_MS = [5_000, 30_000, 120_000, 600_000]; // 5s, 30s, 2m, 10m

interface RecipientTarget {
  recipientUserId: string;
  merchantId: string;
}

// ─── Async Non-Blocking Socket Delivery & Bounded Retry Worker ─────────────────────────
export async function deliverNotificationSocket(
  notification: INotification,
  unreadCount: number
): Promise<boolean> {
  const io = getIoInstance();
  if (!io) {
    console.log(
      `[NotificationHandler] Socket server reference not ready; marking notification ${notification._id} as SOCKET_FAILED`
    );
    await updateDeliveryFailure(notification);
    return false;
  }

  try {
    const room =
      notification.broadcastScope === 'MERCHANT'
        ? `merchant:${notification.merchantId}`
        : `user:${notification.recipientUserId}`;

    io.to(room).emit('notification:new', {
      notification,
      unreadCount,
    });

    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          deliveryStatus: 'SOCKET_DELIVERED',
          lastDeliveryAttemptAt: new Date(),
          nextRetryAt: null,
        },
        $inc: { deliveryAttempts: 1 },
      }
    );
    console.log(`[NotificationHandler] Delivered socket notification:new to room: ${room}`);
    return true;
  } catch (err: any) {
    console.error(`[NotificationHandler] Socket delivery error for ${notification._id}:`, err?.message);
    await updateDeliveryFailure(notification);
    return false;
  }
}

async function updateDeliveryFailure(notification: INotification) {
  const attempts = (notification.deliveryAttempts || 0) + 1;
  const backoffMs = RETRY_BACKOFF_SCHEDULE_MS[attempts - 1];
  const nextRetryAt = backoffMs ? new Date(Date.now() + backoffMs) : null;

  await Notification.updateOne(
    { _id: notification._id },
    {
      $set: {
        deliveryStatus: 'SOCKET_FAILED',
        lastDeliveryAttemptAt: new Date(),
        nextRetryAt,
      },
      $inc: { deliveryAttempts: 1 },
    }
  );
}

// Background retry worker for failed socket deliveries
export async function retryFailedSocketDeliveries(): Promise<number> {
  try {
    const now = new Date();
    const pendingRetryNotifications = await Notification.find({
      deliveryStatus: 'SOCKET_FAILED',
      nextRetryAt: { $ne: null, $lte: now },
      deliveryAttempts: { $lt: 5 },
    }).limit(20);

    let retriedCount = 0;
    for (const notif of pendingRetryNotifications) {
      const unreadCount = await Notification.countDocuments({
        recipientUserId: notif.recipientUserId,
        notificationStatus: 'ACTIVE',
        readAt: null,
        clearedAt: null,
      });
      const success = await deliverNotificationSocket(notif, unreadCount);
      if (success) retriedCount++;
    }
    return retriedCount;
  } catch (err) {
    console.error('[NotificationHandler] Error in retryFailedSocketDeliveries worker:', err);
    return 0;
  }
}

// ─── Recipient Resolution ────────────────────────────────────────────────────────
async function resolveRecipients(
  eventKey: string,
  payload: BusinessEventEnvelope
): Promise<RecipientTarget[]> {
  const targets: RecipientTarget[] = [];

  // Case A: Explicit target user
  if (payload.targetUserId) {
    let merchantId = payload.merchantId;
    if (!merchantId) {
      const merchant = await Merchant.findOne({ userId: payload.targetUserId }).lean();
      merchantId = merchant ? merchant.merchantId : `m_${payload.targetUserId}`;
    }
    targets.push({ recipientUserId: payload.targetUserId, merchantId });
    return targets;
  }

  // Case B: Admin event -> resolve all active admin / super_admin user IDs
  const isAdminEvent = eventKey.startsWith('admin.') || payload.notifyAdmins === true;
  if (isAdminEvent) {
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      status: 'active',
    })
      .select('_id')
      .lean();

    const adminUserIds = adminUsers.map((u) => u._id.toString());
    const adminMerchants = await Merchant.find({ userId: { $in: adminUserIds } })
      .select('merchantId userId')
      .lean();

    const merchantMap = new Map(adminMerchants.map((m) => [m.userId, m.merchantId]));
    for (const adminId of adminUserIds) {
      targets.push({
        recipientUserId: adminId,
        merchantId: merchantMap.get(adminId) || `m_${adminId}`,
      });
    }
    return targets;
  }

  // Case C: Merchant event without explicit targetUserId -> resolve merchant owner userId
  if (payload.merchantId) {
    const merchant = await Merchant.findOne({ merchantId: payload.merchantId }).lean();
    if (merchant) {
      targets.push({ recipientUserId: merchant.userId, merchantId: merchant.merchantId });
    } else {
      // Fallback if merchantId starts with m_
      const userId = payload.merchantId.startsWith('m_')
        ? payload.merchantId.substring(2)
        : payload.merchantId;
      targets.push({ recipientUserId: userId, merchantId: payload.merchantId });
    }
    return targets;
  }

  return targets;
}

// ─── Main Notification Event Pipeline ────────────────────────────────────────────
async function handleNotificationEvent(eventKey: string, payload: BusinessEventEnvelope) {
  const eventId =
    payload.eventId ||
    `${eventKey}_${payload.merchantId || payload.targetUserId || 'sys'}_${payload.entityId || 'gen'}_${Date.now()}`;

  // ── Step 1: Idempotency Claim with Stale Lock Recovery ──
  let eventRecord = await EventProcessing.findOne({ eventId });
  if (eventRecord) {
    if (eventRecord.status === 'COMPLETED') {
      console.log(`[NotificationHandler] Event ${eventId} already COMPLETED. Skipping.`);
      return;
    }

    const isStale =
      eventRecord.status === 'PROCESSING' &&
      eventRecord.updatedAt.getTime() < Date.now() - EVENT_PROCESSING_LOCK_TIMEOUT_MS;

    if (isStale) {
      console.warn(`[NotificationHandler] Reclaiming stale lock for event ${eventId}`);
      const reclaimed = await EventProcessing.findOneAndUpdate(
        { eventId, status: 'PROCESSING', updatedAt: { $lt: new Date(Date.now() - EVENT_PROCESSING_LOCK_TIMEOUT_MS) } },
        {
          $set: { status: 'PROCESSING', updatedAt: new Date() },
          $inc: { attempts: 1 },
        },
        { new: true }
      );
      if (!reclaimed) {
        console.log(`[NotificationHandler] Concurrent lock reclaim failed for event ${eventId}. Skipping.`);
        return;
      }
      eventRecord = reclaimed;
    } else {
      console.log(`[NotificationHandler] Event ${eventId} is currently PROCESSING. Skipping.`);
      return;
    }
  } else {
    try {
      eventRecord = await EventProcessing.create({
        eventId,
        eventKey,
        status: 'PROCESSING',
        attempts: 1,
        processedAt: null,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        console.log(`[NotificationHandler] Concurrent creation race for event ${eventId}. Skipping.`);
        return;
      }
      throw err;
    }
  }

  try {
    // ── Step 2: Snapshotted Recipient Resolution ──
    const recipients = await resolveRecipients(eventKey, payload);
    if (recipients.length === 0) {
      console.warn(`[NotificationHandler] No recipients resolved for event ${eventKey} (${eventId})`);
      await EventProcessing.updateOne(
        { eventId },
        { $set: { status: 'COMPLETED', processedAt: new Date() } }
      );
      return;
    }

    const templateFn = NotificationTemplates[eventKey as keyof typeof NotificationTemplates];
    if (!templateFn) {
      console.warn(`[NotificationHandler] No template function registered for event: ${eventKey}`);
      await EventProcessing.updateOne(
        { eventId },
        { $set: { status: 'FAILED', error: 'No template registered' } }
      );
      return;
    }

    const template = templateFn(payload);
    const policy = getEventPolicy(eventKey);

    // ── Step 3: Atomic DB Persistence per Recipient ──
    const createdNotifications: { notification: INotification; recipientUserId: string }[] = [];

    for (const { recipientUserId, merchantId } of recipients) {
      const dedupeKey = `${eventKey}:${recipientUserId}:${payload.entityId || 'global'}`;

      // Check if notification for (eventId, recipientUserId) already exists
      const existingForEvent = await Notification.findOne({ eventId, recipientUserId });
      if (existingForEvent) {
        createdNotifications.push({ notification: existingForEvent, recipientUserId });
        continue;
      }

      // Handle REPLACE_ACTIVE strategy
      let supersededByNotifId: any = null;
      const newNotificationDoc = new Notification({
        recipientUserId,
        merchantId,
        eventId,
        dedupeKey,
        dedupeStrategy: policy.dedupeStrategy,
        broadcastScope: policy.broadcastScope,
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
          id: payload.actor?.id || 'system',
          name: payload.actor?.name || 'System',
          type: payload.actor?.type || 'system',
        },
        actions: template.actions,
        channels: { inApp: true, socket: true, email: false },
        notificationStatus: 'ACTIVE',
        readAt: null,
        clearedAt: null,
        deliveryStatus: 'PERSISTED',
        deliveryAttempts: 0,
        expiresAt: template.expiresAt,
        scheduledFor: template.scheduledFor,
        metadata: payload.metadata,
      });

      const savedNotif = await newNotificationDoc.save();
      createdNotifications.push({ notification: savedNotif, recipientUserId });

      if (policy.dedupeStrategy === 'REPLACE_ACTIVE') {
        const now = new Date();
        await Notification.updateMany(
          {
            _id: { $ne: savedNotif._id },
            recipientUserId,
            dedupeKey,
            notificationStatus: 'ACTIVE',
          },
          {
            $set: {
              notificationStatus: 'CLEARED',
              clearedAt: now,
              supersededAt: now,
              supersededBy: savedNotif._id,
            },
          }
        );
      }

      // Audit Log Entry
      logAudit('NOTIFICATION_DISPATCHED', {
        userId: payload.actor?.id,
        metadata: {
          eventId,
          eventKey,
          targetRecipientUserId: recipientUserId,
          targetMerchantId: merchantId,
          notificationId: savedNotif._id,
          category: template.category,
          title: template.title,
        },
      });
    }

    // Mark EventProcessing as COMPLETED
    await EventProcessing.updateOne(
      { eventId },
      { $set: { status: 'COMPLETED', processedAt: new Date() } }
    );

    // ── Step 4: Non-Blocking Async Socket Delivery ──
    setImmediate(async () => {
      for (const item of createdNotifications) {
        try {
          const unreadCount = await Notification.countDocuments({
            recipientUserId: item.recipientUserId,
            notificationStatus: 'ACTIVE',
            readAt: null,
            clearedAt: null,
          });
          await deliverNotificationSocket(item.notification, unreadCount);
        } catch (deliveryErr) {
          console.error('[NotificationHandler] Async socket delivery error:', deliveryErr);
        }
      }
    });
  } catch (err: any) {
    console.error(`[NotificationHandler] Error processing event ${eventKey} (${eventId}):`, err);
    await EventProcessing.updateOne(
      { eventId },
      { $set: { status: 'FAILED', error: err?.message || 'Processing failed' } }
    );
  }
}

// Subscribe to all business events
Object.values(NotificationEvents).forEach((eventKey) => {
  NotificationEventBus.subscribe(eventKey, (payload: BusinessEventEnvelope) => {
    handleNotificationEvent(eventKey, payload);
  });
});
