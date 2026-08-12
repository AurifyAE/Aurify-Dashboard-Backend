"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitBusinessEvent = exports.NotificationEventBus = exports.getEventPolicy = exports.EVENT_POLICIES = exports.NotificationEvents = void 0;
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
    ADMIN_MERCHANT_PROFILE_UPDATED: 'admin.merchant.profile.updated',
    LIMITS_UPDATED: 'merchant.limits.updated',
};
exports.EVENT_POLICIES = {
    [exports.NotificationEvents.MERCHANT_APPROVED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.MERCHANT_REJECTED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.SUBSCRIPTION_UPDATED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.LAYOUT_PUBLISHED]: {
        broadcastScope: 'MERCHANT',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.LAYOUT_UNPUBLISHED]: {
        broadcastScope: 'MERCHANT',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.COMMODITY_CONFIG_CHANGED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.PASSWORD_CHANGED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'NONE',
    },
    [exports.NotificationEvents.PROFILE_UPDATED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.ADMIN_MERCHANT_PROFILE_UPDATED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
    [exports.NotificationEvents.LIMITS_UPDATED]: {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    },
};
const getEventPolicy = (eventKey) => {
    return (exports.EVENT_POLICIES[eventKey] || {
        broadcastScope: 'USER',
        dedupeStrategy: 'REPLACE_ACTIVE',
    });
};
exports.getEventPolicy = getEventPolicy;
class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    subscribe(eventKey, handler) {
        const list = this.handlers.get(eventKey) || [];
        list.push(handler);
        this.handlers.set(eventKey, list);
        console.log(`🔔 EventBus: Subscribed handler for event: ${eventKey}`);
    }
    publish(eventKey, payload) {
        console.log(`🔔 EventBus: Publishing event: ${eventKey}`);
        const fullPayload = { ...payload, eventKey };
        const list = this.handlers.get(eventKey) || [];
        list.forEach((handler) => {
            try {
                handler(fullPayload);
            }
            catch (err) {
                console.error(`Error in event handler for ${eventKey}:`, err);
            }
        });
    }
}
exports.NotificationEventBus = new EventBus();
const emitBusinessEvent = (eventKey, payload) => {
    exports.NotificationEventBus.publish(eventKey, payload);
};
exports.emitBusinessEvent = emitBusinessEvent;
