import mongoose, { Document, Schema } from 'mongoose';

export type SecurityEvent =
  | 'INVALID_JWT'
  | 'EXPIRED_JWT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACCOUNT_LOCKED'
  | 'FAILED_LOGIN'
  | 'BLOCKED_REQUEST'
  | 'SUSPICIOUS_PAYLOAD'
  | 'UNAUTHORIZED_ROLE_ACCESS';

export interface ISecurityLog extends Document {
  event: SecurityEvent;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  path?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const SecurityLogSchema = new Schema<ISecurityLog>(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'INVALID_JWT',
        'EXPIRED_JWT',
        'RATE_LIMIT_EXCEEDED',
        'ACCOUNT_LOCKED',
        'FAILED_LOGIN',
        'BLOCKED_REQUEST',
        'SUSPICIOUS_PAYLOAD',
        'UNAUTHORIZED_ROLE_ACCESS',
      ],
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    userId: { type: String, index: true },
    email: { type: String },
    path: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ─── TTL: auto-delete after 6 months ─────────────────────────────────────────
SecurityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

const SecurityLog = mongoose.model<ISecurityLog>('SecurityLog', SecurityLogSchema);
export default SecurityLog;
