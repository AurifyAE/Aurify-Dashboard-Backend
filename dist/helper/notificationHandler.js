"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverNotificationSocket = deliverNotificationSocket;
exports.retryFailedSocketDeliveries = retryFailedSocketDeliveries;
const eventBus_1 = require("./eventBus");
const notification_templates_1 = require("../config/notification.templates");
const Notification_1 = __importDefault(require("../models/Notification"));
const EventProcessing_1 = __importDefault(require("../models/EventProcessing"));
const User_1 = __importDefault(require("../models/User"));
const Merchant_1 = __importDefault(require("../models/Merchant"));
const socketService_1 = require("../sockets/socketService");
const audit_service_1 = require("../services/audit.service");
const EVENT_PROCESSING_LOCK_TIMEOUT_MS = 30000;
const RETRY_BACKOFF_SCHEDULE_MS = [5000, 30000, 120000, 600000]; // 5s, 30s, 2m, 10m
// ─── Async Non-Blocking Socket Delivery & Bounded Retry Worker ─────────────────────────
async function deliverNotificationSocket(notification, unreadCount) {
    const io = (0, socketService_1.getIoInstance)();
    if (!io) {
        console.log(`[NotificationHandler] Socket server reference not ready; marking notification ${notification._id} as SOCKET_FAILED`);
        await updateDeliveryFailure(notification);
        return false;
    }
    try {
        const room = notification.broadcastScope === 'MERCHANT'
            ? `merchant:${notification.merchantId}`
            : `user:${notification.recipientUserId}`;
        io.to(room).emit('notification:new', {
            notification,
            unreadCount,
        });
        await Notification_1.default.updateOne({ _id: notification._id }, {
            $set: {
                deliveryStatus: 'SOCKET_DELIVERED',
                lastDeliveryAttemptAt: new Date(),
                nextRetryAt: null,
            },
            $inc: { deliveryAttempts: 1 },
        });
        console.log(`[NotificationHandler] Delivered socket notification:new to room: ${room}`);
        return true;
    }
    catch (err) {
        console.error(`[NotificationHandler] Socket delivery error for ${notification._id}:`, err?.message);
        await updateDeliveryFailure(notification);
        return false;
    }
}
async function updateDeliveryFailure(notification) {
    const attempts = (notification.deliveryAttempts || 0) + 1;
    const backoffMs = RETRY_BACKOFF_SCHEDULE_MS[attempts - 1];
    const nextRetryAt = backoffMs ? new Date(Date.now() + backoffMs) : null;
    await Notification_1.default.updateOne({ _id: notification._id }, {
        $set: {
            deliveryStatus: 'SOCKET_FAILED',
            lastDeliveryAttemptAt: new Date(),
            nextRetryAt,
        },
        $inc: { deliveryAttempts: 1 },
    });
}
// Background retry worker for failed socket deliveries
async function retryFailedSocketDeliveries() {
    try {
        const now = new Date();
        const pendingRetryNotifications = await Notification_1.default.find({
            deliveryStatus: 'SOCKET_FAILED',
            nextRetryAt: { $ne: null, $lte: now },
            deliveryAttempts: { $lt: 5 },
        }).limit(20);
        let retriedCount = 0;
        for (const notif of pendingRetryNotifications) {
            const unreadCount = await Notification_1.default.countDocuments({
                recipientUserId: notif.recipientUserId,
                notificationStatus: 'ACTIVE',
                readAt: null,
                clearedAt: null,
            });
            const success = await deliverNotificationSocket(notif, unreadCount);
            if (success)
                retriedCount++;
        }
        return retriedCount;
    }
    catch (err) {
        console.error('[NotificationHandler] Error in retryFailedSocketDeliveries worker:', err);
        return 0;
    }
}
// ─── Recipient Resolution ────────────────────────────────────────────────────────
async function resolveRecipients(eventKey, payload) {
    const targets = [];
    // Case A: Explicit target user
    if (payload.targetUserId) {
        let merchantId = payload.merchantId;
        if (!merchantId) {
            const merchant = await Merchant_1.default.findOne({ userId: payload.targetUserId }).lean();
            merchantId = merchant ? merchant.merchantId : `m_${payload.targetUserId}`;
        }
        targets.push({ recipientUserId: payload.targetUserId, merchantId });
        return targets;
    }
    // Case B: Admin event -> resolve all active admin / super_admin user IDs
    const isAdminEvent = eventKey.startsWith('admin.') || payload.notifyAdmins === true;
    if (isAdminEvent) {
        const adminUsers = await User_1.default.find({
            role: { $in: ['admin', 'super_admin'] },
            status: 'active',
        })
            .select('_id')
            .lean();
        const adminUserIds = adminUsers.map((u) => u._id.toString());
        const adminMerchants = await Merchant_1.default.find({ userId: { $in: adminUserIds } })
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
        const merchant = await Merchant_1.default.findOne({ merchantId: payload.merchantId }).lean();
        if (merchant) {
            targets.push({ recipientUserId: merchant.userId, merchantId: merchant.merchantId });
        }
        else {
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
async function handleNotificationEvent(eventKey, payload) {
    const eventId = payload.eventId ||
        `${eventKey}_${payload.merchantId || payload.targetUserId || 'sys'}_${payload.entityId || 'gen'}_${Date.now()}`;
    // ── Step 1: Idempotency Claim with Stale Lock Recovery ──
    let eventRecord = await EventProcessing_1.default.findOne({ eventId });
    if (eventRecord) {
        if (eventRecord.status === 'COMPLETED') {
            console.log(`[NotificationHandler] Event ${eventId} already COMPLETED. Skipping.`);
            return;
        }
        const isStale = eventRecord.status === 'PROCESSING' &&
            eventRecord.updatedAt.getTime() < Date.now() - EVENT_PROCESSING_LOCK_TIMEOUT_MS;
        if (isStale) {
            console.warn(`[NotificationHandler] Reclaiming stale lock for event ${eventId}`);
            const reclaimed = await EventProcessing_1.default.findOneAndUpdate({ eventId, status: 'PROCESSING', updatedAt: { $lt: new Date(Date.now() - EVENT_PROCESSING_LOCK_TIMEOUT_MS) } }, {
                $set: { status: 'PROCESSING', updatedAt: new Date() },
                $inc: { attempts: 1 },
            }, { new: true });
            if (!reclaimed) {
                console.log(`[NotificationHandler] Concurrent lock reclaim failed for event ${eventId}. Skipping.`);
                return;
            }
            eventRecord = reclaimed;
        }
        else {
            console.log(`[NotificationHandler] Event ${eventId} is currently PROCESSING. Skipping.`);
            return;
        }
    }
    else {
        try {
            eventRecord = await EventProcessing_1.default.create({
                eventId,
                eventKey,
                status: 'PROCESSING',
                attempts: 1,
                processedAt: null,
            });
        }
        catch (err) {
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
            await EventProcessing_1.default.updateOne({ eventId }, { $set: { status: 'COMPLETED', processedAt: new Date() } });
            return;
        }
        const templateFn = notification_templates_1.NotificationTemplates[eventKey];
        if (!templateFn) {
            console.warn(`[NotificationHandler] No template function registered for event: ${eventKey}`);
            await EventProcessing_1.default.updateOne({ eventId }, { $set: { status: 'FAILED', error: 'No template registered' } });
            return;
        }
        const template = templateFn(payload);
        const policy = (0, eventBus_1.getEventPolicy)(eventKey);
        // ── Step 3: Atomic DB Persistence per Recipient ──
        const createdNotifications = [];
        for (const { recipientUserId, merchantId } of recipients) {
            const dedupeKey = `${eventKey}:${recipientUserId}:${payload.entityId || 'global'}`;
            // Check if notification for (eventId, recipientUserId) already exists
            const existingForEvent = await Notification_1.default.findOne({ eventId, recipientUserId });
            if (existingForEvent) {
                createdNotifications.push({ notification: existingForEvent, recipientUserId });
                continue;
            }
            // Handle REPLACE_ACTIVE strategy
            let supersededByNotifId = null;
            const newNotificationDoc = new Notification_1.default({
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
                await Notification_1.default.updateMany({
                    _id: { $ne: savedNotif._id },
                    recipientUserId,
                    dedupeKey,
                    notificationStatus: 'ACTIVE',
                }, {
                    $set: {
                        notificationStatus: 'CLEARED',
                        clearedAt: now,
                        supersededAt: now,
                        supersededBy: savedNotif._id,
                    },
                });
            }
            // Audit Log Entry
            (0, audit_service_1.logAudit)('NOTIFICATION_DISPATCHED', {
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
        await EventProcessing_1.default.updateOne({ eventId }, { $set: { status: 'COMPLETED', processedAt: new Date() } });
        // ── Step 4: Non-Blocking Async Socket Delivery ──
        setImmediate(async () => {
            for (const item of createdNotifications) {
                try {
                    const unreadCount = await Notification_1.default.countDocuments({
                        recipientUserId: item.recipientUserId,
                        notificationStatus: 'ACTIVE',
                        readAt: null,
                        clearedAt: null,
                    });
                    await deliverNotificationSocket(item.notification, unreadCount);
                }
                catch (deliveryErr) {
                    console.error('[NotificationHandler] Async socket delivery error:', deliveryErr);
                }
            }
        });
    }
    catch (err) {
        console.error(`[NotificationHandler] Error processing event ${eventKey} (${eventId}):`, err);
        await EventProcessing_1.default.updateOne({ eventId }, { $set: { status: 'FAILED', error: err?.message || 'Processing failed' } });
    }
}
// Subscribe to all business events
Object.values(eventBus_1.NotificationEvents).forEach((eventKey) => {
    eventBus_1.NotificationEventBus.subscribe(eventKey, (payload) => {
        handleNotificationEvent(eventKey, payload);
    });
});
