import { BroadcastScope, DedupeStrategy } from '../models/Notification';

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
  ADMIN_MERCHANT_PROFILE_UPDATED: 'admin.merchant.profile.updated',
  LIMITS_UPDATED: 'merchant.limits.updated',
} as const;

export type NotificationEvent = (typeof NotificationEvents)[keyof typeof NotificationEvents];

export interface EventPolicy {
  broadcastScope: BroadcastScope;
  dedupeStrategy: DedupeStrategy;
}

export const EVENT_POLICIES: Record<string, EventPolicy> = {
  [NotificationEvents.MERCHANT_APPROVED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.MERCHANT_REJECTED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.SUBSCRIPTION_UPDATED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.LAYOUT_PUBLISHED]: {
    broadcastScope: 'MERCHANT',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.LAYOUT_UNPUBLISHED]: {
    broadcastScope: 'MERCHANT',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.COMMODITY_CONFIG_CHANGED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.PASSWORD_CHANGED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'NONE',
  },
  [NotificationEvents.PROFILE_UPDATED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.ADMIN_MERCHANT_PROFILE_UPDATED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
  [NotificationEvents.LIMITS_UPDATED]: {
    broadcastScope: 'USER',
    dedupeStrategy: 'REPLACE_ACTIVE',
  },
};

export const getEventPolicy = (eventKey: string): EventPolicy => {
  return (
    EVENT_POLICIES[eventKey] || {
      broadcastScope: 'USER',
      dedupeStrategy: 'REPLACE_ACTIVE',
    }
  );
};

export interface BusinessEventEnvelope {
  eventId?: string;
  eventKey?: string;
  merchantId?: string;
  targetUserId?: string;
  actorName?: string;
  entityId?: string;
  actor?: { id: string; name: string; type: 'admin' | 'system' | 'user' };
  metadata?: Record<string, any>;
  [key: string]: any;
}

class EventBus {
  private handlers: Map<string, Function[]> = new Map();

  subscribe(eventKey: string, handler: Function) {
    const list = this.handlers.get(eventKey) || [];
    list.push(handler);
    this.handlers.set(eventKey, list);
    console.log(`🔔 EventBus: Subscribed handler for event: ${eventKey}`);
  }

  publish(eventKey: string, payload: BusinessEventEnvelope) {
    console.log(`🔔 EventBus: Publishing event: ${eventKey}`);
    const fullPayload: BusinessEventEnvelope = { ...payload, eventKey };
    const list = this.handlers.get(eventKey) || [];
    list.forEach((handler) => {
      try {
        handler(fullPayload);
      } catch (err) {
        console.error(`Error in event handler for ${eventKey}:`, err);
      }
    });
  }
}

export const NotificationEventBus = new EventBus();

export const emitBusinessEvent = (eventKey: string, payload: BusinessEventEnvelope) => {
  NotificationEventBus.publish(eventKey, payload);
};
