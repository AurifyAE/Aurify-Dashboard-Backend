export const NotificationEvents = {
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
} as const;

export type NotificationEvent = typeof NotificationEvents[keyof typeof NotificationEvents];

class EventBus {
  private handlers: Map<string, Function[]> = new Map();

  subscribe(event: string, handler: Function) {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
    console.log(`🔔 EventBus: Subscribed handler for event: ${event}`);
  }

  publish(event: string, payload: any) {
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

export const NotificationEventBus = new EventBus();

export const emitBusinessEvent = (event: string, payload: any) => {
  NotificationEventBus.publish(event, payload);
};
