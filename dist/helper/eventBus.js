'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.emitBusinessEvent = exports.NotificationEventBus = exports.NotificationEvents = void 0;
exports.NotificationEvents = {
  // Marketplace / Merchant status
  MERCHANT_APPROVED: 'marketplace.merchant.approved',
  MERCHANT_REJECTED: 'marketplace.merchant.rejected',
  SUBSCRIPTION_UPDATED: 'marketplace.subscription.updated',
  // Screen Builder Layouts
  LAYOUT_PUBLISHED: 'screen.layout.published',
  LAYOUT_UNPUBLISHED: 'screen.layout.unpublished',
  // Spot Rates & Commodities configuration
  COMMODITY_CONFIG_CHANGED: 'spotrate.commodity.config.changed',
  // User Settings / Security / Admin Updates
  PASSWORD_CHANGED: 'auth.password.changed',
  PROFILE_UPDATED: 'auth.profile.updated',
  LIMITS_UPDATED: 'merchant.limits.updated',
};
class EventBus {
  constructor() {
    this.handlers = new Map();
  }
  subscribe(event, handler) {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
    console.log(`🔔 EventBus: Subscribed handler for event: ${event}`);
  }
  publish(event, payload) {
    console.log(`🔔 EventBus: Publishing event: ${event}`);
    const list = this.handlers.get(event) || [];
    list.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err);
      }
    });
  }
}
exports.NotificationEventBus = new EventBus();
const emitBusinessEvent = (event, payload) => {
  exports.NotificationEventBus.publish(event, payload);
};
exports.emitBusinessEvent = emitBusinessEvent;
