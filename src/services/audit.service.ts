import AuditLog, { AuditAction } from '../models/AuditLog';
import SecurityLog, { SecurityEvent } from '../models/SecurityLog';

interface AuditOptions {
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

interface SecurityOptions {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

// ─── Business Audit Logger ────────────────────────────────────────────────────
/**
 * Records a business audit event asynchronously without blocking the request.
 * Failures are silently swallowed so logging never interrupts the response cycle.
 */
export const logAudit = (action: AuditAction, opts: AuditOptions = {}): void => {
  AuditLog.create({
    action,
    userId: opts.userId,
    email: opts.email,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
    metadata: opts.metadata,
  }).catch((err) => {
    console.error('[AuditLog] Failed to write audit log:', err?.message);
  });
};

// ─── Security Event Logger ────────────────────────────────────────────────────
/**
 * Records a security threat event asynchronously.
 * Failures are silently swallowed so logging never interrupts the response cycle.
 */
export const logSecurity = (event: SecurityEvent, opts: SecurityOptions = {}): void => {
  SecurityLog.create({
    event,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
    userId: opts.userId,
    email: opts.email,
    path: opts.path,
    metadata: opts.metadata,
  }).catch((err) => {
    console.error('[SecurityLog] Failed to write security log:', err?.message);
  });
};
