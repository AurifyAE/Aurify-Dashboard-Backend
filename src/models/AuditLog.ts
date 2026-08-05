import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'REGISTER'
  | 'PASSWORD_CHANGE'
  | 'PROFILE_UPDATE'
  | 'ROLE_UPDATE'
  | 'MERCHANT_APPROVAL'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'USER_DELETED'
  | 'SETTINGS_UPDATE';

export interface IAuditLog extends Document {
  userId?: string;
  email?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, index: true },
    email: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'LOGOUT_ALL',
        'REGISTER',
        'PASSWORD_CHANGE',
        'PROFILE_UPDATE',
        'ROLE_UPDATE',
        'MERCHANT_APPROVAL',
        'USER_SUSPENDED',
        'USER_ACTIVATED',
        'USER_DELETED',
        'SETTINGS_UPDATE',
      ],
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ─── TTL: auto-delete after 1 year ───────────────────────────────────────────
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
