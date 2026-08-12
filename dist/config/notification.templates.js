"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationTemplates = void 0;
const eventBus_1 = require("../helper/eventBus");
exports.NotificationTemplates = {
    // --- Marketplace & Merchant Approval Events ---
    [eventBus_1.NotificationEvents.MERCHANT_APPROVED]: (payload) => ({
        title: 'Merchant Account Approved',
        message: `Your merchant account has been approved by admin ${payload.actorName || payload.actor?.name || 'Admin'}. Welcome to Aurify!`,
        type: 'SUCCESS',
        category: 'APPROVAL',
        sourceModule: 'MARKETPLACE',
        iconKey: 'check-circle',
        actions: [{ label: 'Go to Dashboard', url: '/dashboard' }],
        isPinned: true,
    }),
    [eventBus_1.NotificationEvents.MERCHANT_REJECTED]: (payload) => ({
        title: 'Merchant Registration Rejected',
        message: `Your merchant account request was rejected by admin ${payload.actorName || payload.actor?.name || 'Admin'}. Please update details or contact support.`,
        type: 'ERROR',
        category: 'APPROVAL',
        sourceModule: 'MARKETPLACE',
        iconKey: 'x-circle',
        actions: [{ label: 'Review Details', url: '/dashboard/merchant-profile' }],
        isPinned: true,
    }),
    [eventBus_1.NotificationEvents.SUBSCRIPTION_UPDATED]: (payload) => ({
        title: 'Subscription Updated',
        message: `Your subscription was updated by admin ${payload.actorName || payload.actor?.name || 'Admin'}${payload.planName ? ` to plan "${payload.planName}"` : ''}.`,
        type: 'SUCCESS',
        category: 'BILLING',
        sourceModule: 'BILLING',
        iconKey: 'credit-card',
        actions: [{ label: 'View Profile', url: '/dashboard/merchant-profile' }],
    }),
    // --- Limits Management ---
    [eventBus_1.NotificationEvents.LIMITS_UPDATED]: (payload) => ({
        title: 'Limits Updated By Admin',
        message: `Admin ${payload.actorName || payload.actor?.name || 'Admin'} changed your account limits: Max Screens set to ${payload.maxScreens || 1}, Max Devices set to ${payload.maxDevices || 1}.`,
        type: 'INFO',
        category: 'ADMIN',
        sourceModule: 'ADMIN',
        iconKey: 'sliders',
        actions: [{ label: 'Manage Screens', url: '/dashboard/screen-builder' }],
    }),
    // --- Layout Publishing ---
    [eventBus_1.NotificationEvents.LAYOUT_PUBLISHED]: (payload) => ({
        title: 'Screen Layout Published',
        message: `Layout "${payload.layoutName || 'Screen'}" has been successfully published to screens by ${payload.actorName || payload.actor?.name || 'User'}.`,
        type: 'SUCCESS',
        category: 'SYSTEM',
        sourceModule: 'SCREEN_BUILDER',
        iconKey: 'tv',
        actions: [{ label: 'View Screens', url: '/dashboard/screen-builder' }],
    }),
    [eventBus_1.NotificationEvents.LAYOUT_UNPUBLISHED]: (payload) => ({
        title: 'Layout Unpublished',
        message: `Layout "${payload.layoutName || 'Screen'}" was unpublished by ${payload.actorName || payload.actor?.name || 'User'}.`,
        type: 'WARNING',
        category: 'SYSTEM',
        sourceModule: 'SCREEN_BUILDER',
        iconKey: 'eye-off',
        actions: [{ label: 'View Screen Builder', url: '/dashboard/screen-builder' }],
    }),
    // --- Spot Rate Commodities ---
    [eventBus_1.NotificationEvents.COMMODITY_CONFIG_CHANGED]: (payload) => ({
        title: 'Commodity Config Changed',
        message: `Your allowed commodities configuration was updated by admin ${payload.actorName || payload.actor?.name || 'Admin'}.`,
        type: 'INFO',
        category: 'ADMIN',
        sourceModule: 'ADMIN',
        iconKey: 'trending-up',
        actions: [{ label: 'View Spot Rates', url: '/dashboard/spotrate' }],
    }),
    // --- Profile & Authentication ---
    [eventBus_1.NotificationEvents.PASSWORD_CHANGED]: (payload) => ({
        title: 'Password Changed Successfully',
        message: `The password for your account was changed by ${payload.actorName || payload.actor?.name || 'User'}.`,
        type: 'WARNING',
        category: 'SECURITY',
        sourceModule: 'AUTH',
        iconKey: 'key',
        actions: [{ label: 'Profile Settings', url: '/dashboard/settings' }],
    }),
    [eventBus_1.NotificationEvents.PROFILE_UPDATED]: (payload) => ({
        title: 'Profile Updated',
        message: payload.actorName || payload.actor?.name
            ? `Your company profile was updated by ${payload.actorName || payload.actor?.name}.`
            : 'Your company profile was updated successfully.',
        type: 'INFO',
        category: 'ADMIN',
        sourceModule: 'ADMIN',
        iconKey: 'user-check',
        actions: [{ label: 'Review Changes', url: '/dashboard/merchant-profile' }],
    }),
    [eventBus_1.NotificationEvents.ADMIN_MERCHANT_PROFILE_UPDATED]: (payload) => ({
        title: 'Merchant Profile Updated',
        message: `Merchant "${payload.companyName || 'Merchant'}" updated their company profile details.`,
        type: 'INFO',
        category: 'ADMIN',
        sourceModule: 'ADMIN',
        iconKey: 'user-check',
        actions: [{ label: 'View Merchants', url: '/admin' }],
    }),
};
