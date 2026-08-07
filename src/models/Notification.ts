import mongoose, { Schema, Document } from 'mongoose';

export type DedupeStrategy = 'NONE' | 'ACTIVE_WINDOW' | 'REPLACE_ACTIVE' | 'GROUP';
export type BroadcastScope = 'USER' | 'MERCHANT';
export type NotificationLifecycleStatus = 'ACTIVE' | 'CLEARED';
export type DeliveryTelemetryStatus = 'PERSISTED' | 'SOCKET_DELIVERED' | 'SOCKET_FAILED';

export interface INotification extends Document {
  recipientUserId: string;
  merchantId: string;
  eventId: string;
  dedupeKey: string;
  dedupeStrategy: DedupeStrategy;
  broadcastScope: BroadcastScope;
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  category: 'APPROVAL' | 'ADMIN' | 'SYSTEM' | 'FEATURE' | 'SECURITY' | 'BILLING' | 'WARNING';
  sourceModule:
    | 'MARKETPLACE'
    | 'SCREEN_BUILDER'
    | 'THEME'
    | 'BILLING'
    | 'ADMIN'
    | 'AUTH'
    | 'ANALYTICS'
    | 'SYSTEM';
  version: number;
  silent: boolean;
  isPinned: boolean;
  iconKey?: string;
  actor: {
    id: string;
    name: string;
    type: 'admin' | 'system' | 'user';
  };
  actions: {
    label: string;
    url: string;
  }[];
  channels: {
    inApp: boolean;
    socket: boolean;
    email: boolean;
  };
  notificationStatus: NotificationLifecycleStatus;
  readAt: Date | null;
  clearedAt: Date | null;
  supersededAt?: Date | null;
  supersededBy?: mongoose.Types.ObjectId | null;
  deliveryStatus: DeliveryTelemetryStatus;
  deliveryAttempts: number;
  lastDeliveryAttemptAt?: Date | null;
  nextRetryAt?: Date | null;
  expiresAt?: Date;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientUserId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    eventId: { type: String, required: true },
    dedupeKey: { type: String, required: true, index: true },
    dedupeStrategy: {
      type: String,
      enum: ['NONE', 'ACTIVE_WINDOW', 'REPLACE_ACTIVE', 'GROUP'],
      default: 'REPLACE_ACTIVE',
    },
    broadcastScope: {
      type: String,
      enum: ['USER', 'MERCHANT'],
      default: 'USER',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['SUCCESS', 'INFO', 'WARNING', 'ERROR'], default: 'INFO' },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' },
    category: {
      type: String,
      enum: ['APPROVAL', 'ADMIN', 'SYSTEM', 'FEATURE', 'SECURITY', 'BILLING', 'WARNING'],
      default: 'SYSTEM',
    },
    sourceModule: {
      type: String,
      enum: [
        'MARKETPLACE',
        'SCREEN_BUILDER',
        'THEME',
        'BILLING',
        'ADMIN',
        'AUTH',
        'ANALYTICS',
        'SYSTEM',
      ],
      required: true,
    },
    version: { type: Number, default: 1 },
    silent: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    iconKey: { type: String },
    actor: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, enum: ['admin', 'system', 'user'], default: 'system' },
    },
    actions: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    channels: {
      inApp: { type: Boolean, default: true },
      socket: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    notificationStatus: {
      type: String,
      enum: ['ACTIVE', 'CLEARED'],
      default: 'ACTIVE',
      index: true,
    },
    readAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    supersededAt: { type: Date, default: null },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'Notification', default: null },
    deliveryStatus: {
      type: String,
      enum: ['PERSISTED', 'SOCKET_DELIVERED', 'SOCKET_FAILED'],
      default: 'PERSISTED',
      index: true,
    },
    deliveryAttempts: { type: Number, default: 0 },
    lastDeliveryAttemptAt: { type: Date, default: null },
    nextRetryAt: { type: Date, default: null },
    expiresAt: { type: Date },
    scheduledFor: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Compound unique index ensuring at most 1 notification per (eventId, recipientUserId)
NotificationSchema.index({ eventId: 1, recipientUserId: 1 }, { unique: true });

// Compound indexes for high-throughput queries per user and merchant
NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });
NotificationSchema.index({ recipientUserId: 1, notificationStatus: 1, readAt: 1, clearedAt: 1 });
NotificationSchema.index({ recipientUserId: 1, dedupeKey: 1 });
NotificationSchema.index({ merchantId: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
