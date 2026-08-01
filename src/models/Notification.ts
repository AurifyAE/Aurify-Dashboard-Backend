import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  merchantId: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  category: 'APPROVAL' | 'ADMIN' | 'SYSTEM' | 'FEATURE' | 'SECURITY' | 'BILLING' | 'WARNING';
  sourceModule: 'MARKETPLACE' | 'SCREEN_BUILDER' | 'THEME' | 'BILLING' | 'ADMIN' | 'AUTH' | 'ANALYTICS';
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
  delivery: {
    dashboard: boolean;
    email: boolean;
    push: boolean;
  };
  readAt: Date | null;
  clearedAt: Date | null;
  expiresAt?: Date;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    merchantId: { type: String, required: true, index: true },
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
      enum: ['MARKETPLACE', 'SCREEN_BUILDER', 'THEME', 'BILLING', 'ADMIN', 'AUTH', 'ANALYTICS'],
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
    delivery: {
      dashboard: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
    readAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    expiresAt: { type: Date },
    scheduledFor: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Indexes for fast lookup of active notifications per merchant
NotificationSchema.index({ merchantId: 1, clearedAt: 1, createdAt: -1 });
NotificationSchema.index({ merchantId: 1, readAt: 1, clearedAt: 1 });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
