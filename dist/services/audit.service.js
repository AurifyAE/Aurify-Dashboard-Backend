'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.logSecurity = exports.logAudit = void 0;
const AuditLog_1 = __importDefault(require('../models/AuditLog'));
const SecurityLog_1 = __importDefault(require('../models/SecurityLog'));
// ─── Business Audit Logger ────────────────────────────────────────────────────
/**
 * Records a business audit event asynchronously without blocking the request.
 * Failures are silently swallowed so logging never interrupts the response cycle.
 */
const logAudit = (action, opts = {}) => {
  AuditLog_1.default
    .create({
      action,
      userId: opts.userId,
      email: opts.email,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
      metadata: opts.metadata,
    })
    .catch((err) => {
      console.error('[AuditLog] Failed to write audit log:', err?.message);
    });
};
exports.logAudit = logAudit;
// ─── Security Event Logger ────────────────────────────────────────────────────
/**
 * Records a security threat event asynchronously.
 * Failures are silently swallowed so logging never interrupts the response cycle.
 */
const logSecurity = (event, opts = {}) => {
  SecurityLog_1.default
    .create({
      event,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
      userId: opts.userId,
      email: opts.email,
      path: opts.path,
      metadata: opts.metadata,
    })
    .catch((err) => {
      console.error('[SecurityLog] Failed to write security log:', err?.message);
    });
};
exports.logSecurity = logSecurity;
