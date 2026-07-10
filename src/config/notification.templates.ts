import { NotificationEvents } from '../helper/eventBus';

export interface TemplatePayload {
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  category: 'APPROVAL' | 'ADMIN' | 'SYSTEM' | 'FEATURE' | 'SECURITY' | 'BILLING' | 'WARNING';
  sourceModule: 'MARKETPLACE' | 'SCREEN_BUILDER' | 'THEME' | 'BILLING' | 'ADMIN' | 'AUTH' | 'ANALYTICS';
  iconKey: string;
  actions: { label: string; url: string }[];
  isPinned?: boolean;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  silent?: boolean;
  expiresAt?: Date;
  scheduledFor?: Date;
}

export const NotificationTemplates = {
  // --- Marketplace & Merchant Approval Events ---
  [NotificationEvents.MERCHANT_APPROVED]: (payload: { actorName: string }): TemplatePayload => ({
    title: 'Merchant Account Approved',
    message: `Your merchant account has been approved by admin ${payload.actorName}. Welcome to Aurify!`,
    type: 'SUCCESS',
    category: 'APPROVAL',
    sourceModule: 'MARKETPLACE',
    iconKey: 'check-circle',
    actions: [{ label: 'Go to Dashboard', url: '/dashboard' }],
    isPinned: true,
  }),

  [NotificationEvents.MERCHANT_REJECTED]: (payload: { actorName: string }): TemplatePayload => ({
    title: 'Merchant Registration Rejected',
    message: `Your merchant account request was rejected by admin ${payload.actorName}. Please update details or contact support.`,
    type: 'ERROR',
    category: 'APPROVAL',
    sourceModule: 'MARKETPLACE',
    iconKey: 'x-circle',
    actions: [{ label: 'Review Details', url: '/dashboard/merchant-profile' }],
    isPinned: true,
  }),

  [NotificationEvents.SUBSCRIPTION_UPDATED]: (payload: { actorName: string; planName?: string }): TemplatePayload => ({
    title: 'Subscription Updated',
    message: `Your subscription was updated by admin ${payload.actorName}${payload.planName ? ` to plan "${payload.planName}"` : ''}.`,
    type: 'SUCCESS',
    category: 'BILLING',
    sourceModule: 'BILLING',
    iconKey: 'credit-card',
    actions: [{ label: 'View Profile', url: '/dashboard/merchant-profile' }],
  }),

  // --- Limits Management ---
  [NotificationEvents.LIMITS_UPDATED]: (payload: { actorName: string; maxScreens: number; maxDevices: number }): TemplatePayload => ({
    title: 'Limits Updated By Admin',
    message: `Admin ${payload.actorName} changed your account limits: Max Screens set to ${payload.maxScreens}, Max Devices set to ${payload.maxDevices}.`,
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'sliders',
    actions: [{ label: 'Manage Screens', url: '/dashboard/screen-builder' }],
  }),

  // --- Layout Publishing ---
  [NotificationEvents.LAYOUT_PUBLISHED]: (payload: { actorName: string; layoutName: string }): TemplatePayload => ({
    title: 'Screen Layout Published',
    message: `Layout "${payload.layoutName}" has been successfully published to screens by ${payload.actorName}.`,
    type: 'SUCCESS',
    category: 'SYSTEM',
    sourceModule: 'SCREEN_BUILDER',
    iconKey: 'tv',
    actions: [{ label: 'View Screens', url: '/dashboard/screen-builder' }],
  }),

  [NotificationEvents.LAYOUT_UNPUBLISHED]: (payload: { actorName: string; layoutName: string }): TemplatePayload => ({
    title: 'Layout Unpublished',
    message: `Layout "${payload.layoutName}" was unpublished by ${payload.actorName}.`,
    type: 'WARNING',
    category: 'SYSTEM',
    sourceModule: 'SCREEN_BUILDER',
    iconKey: 'eye-off',
    actions: [{ label: 'View Screen Builder', url: '/dashboard/screen-builder' }],
  }),

  // --- Spot Rate Commodities ---
  [NotificationEvents.COMMODITY_CONFIG_CHANGED]: (payload: { actorName: string }): TemplatePayload => ({
    title: 'Commodity Config Changed',
    message: `Your allowed commodities configuration was updated by admin ${payload.actorName}.`,
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'trending-up',
    actions: [{ label: 'View Spot Rates', url: '/dashboard/spotrate' }],
  }),

  // --- Profile & Authentication ---
  [NotificationEvents.PASSWORD_CHANGED]: (payload: { actorName: string }): TemplatePayload => ({
    title: 'Password Changed Successfully',
    message: `The password for your account was changed by admin ${payload.actorName}.`,
    type: 'WARNING',
    category: 'SECURITY',
    sourceModule: 'AUTH',
    iconKey: 'key',
    actions: [{ label: 'Profile Settings', url: '/dashboard/settings' }],
  }),

  [NotificationEvents.PROFILE_UPDATED]: (payload: { actorName: string }): TemplatePayload => ({
    title: 'Profile Updated',
    message: `Your company profile was updated by admin ${payload.actorName}.`,
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'user-check',
    actions: [{ label: 'Review Changes', url: '/dashboard/merchant-profile' }],
  }),
};
