import { NotificationEvents } from '../helper/eventBus';

export interface TemplatePayload {
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  category: 'APPROVAL' | 'ADMIN' | 'SYSTEM' | 'FEATURE' | 'SECURITY' | 'BILLING' | 'WARNING';
  sourceModule:
    | 'MARKETPLACE'
    | 'SCREEN_BUILDER'
    | 'THEME'
    | 'BILLING'
    | 'ADMIN'
    | 'AUTH'
    | 'ANALYTICS';
  iconKey: string;
  actions: { label: string; url: string }[];
  isPinned?: boolean;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  silent?: boolean;
  expiresAt?: Date;
  scheduledFor?: Date;
}

export const NotificationTemplates: Record<string, (payload: any) => TemplatePayload> = {
  // --- Marketplace & Merchant Approval Events ---
  [NotificationEvents.MERCHANT_APPROVED]: (payload: any): TemplatePayload => ({
    title: 'Merchant Account Approved',
    message: `Your merchant account has been approved by admin ${payload.actorName || payload.actor?.name || 'Admin'}. Welcome to Aurify!`,
    type: 'SUCCESS',
    category: 'APPROVAL',
    sourceModule: 'MARKETPLACE',
    iconKey: 'check-circle',
    actions: [{ label: 'Go to Dashboard', url: '/dashboard' }],
    isPinned: true,
  }),

  [NotificationEvents.MERCHANT_REJECTED]: (payload: any): TemplatePayload => ({
    title: 'Merchant Registration Rejected',
    message: `Your merchant account request was rejected by admin ${payload.actorName || payload.actor?.name || 'Admin'}. Please update details or contact support.`,
    type: 'ERROR',
    category: 'APPROVAL',
    sourceModule: 'MARKETPLACE',
    iconKey: 'x-circle',
    actions: [{ label: 'Review Details', url: '/dashboard/merchant-profile' }],
    isPinned: true,
  }),

  [NotificationEvents.SUBSCRIPTION_UPDATED]: (payload: any): TemplatePayload => ({
    title: 'Subscription Updated',
    message: `Your subscription was updated by admin ${payload.actorName || payload.actor?.name || 'Admin'}${payload.planName ? ` to plan "${payload.planName}"` : ''}.`,
    type: 'SUCCESS',
    category: 'BILLING',
    sourceModule: 'BILLING',
    iconKey: 'credit-card',
    actions: [{ label: 'View Profile', url: '/dashboard/merchant-profile' }],
  }),

  // --- Limits Management ---
  [NotificationEvents.LIMITS_UPDATED]: (payload: any): TemplatePayload => ({
    title: 'Limits Updated By Admin',
    message: `Admin ${payload.actorName || payload.actor?.name || 'Admin'} changed your account limits: Max Screens set to ${payload.maxScreens || 1}, Max Devices set to ${payload.maxDevices || 1}.`,
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'sliders',
    actions: [{ label: 'Manage Screens', url: '/dashboard/screen-builder' }],
  }),

  // --- Layout Publishing ---
  [NotificationEvents.LAYOUT_PUBLISHED]: (payload: any): TemplatePayload => ({
    title: 'Screen Layout Published',
    message: `Layout "${payload.layoutName || 'Screen'}" has been successfully published to screens by ${payload.actorName || payload.actor?.name || 'User'}.`,
    type: 'SUCCESS',
    category: 'SYSTEM',
    sourceModule: 'SCREEN_BUILDER',
    iconKey: 'tv',
    actions: [{ label: 'View Screens', url: '/dashboard/screen-builder' }],
  }),

  [NotificationEvents.LAYOUT_UNPUBLISHED]: (payload: any): TemplatePayload => ({
    title: 'Layout Unpublished',
    message: `Layout "${payload.layoutName || 'Screen'}" was unpublished by ${payload.actorName || payload.actor?.name || 'User'}.`,
    type: 'WARNING',
    category: 'SYSTEM',
    sourceModule: 'SCREEN_BUILDER',
    iconKey: 'eye-off',
    actions: [{ label: 'View Screen Builder', url: '/dashboard/screen-builder' }],
  }),

  // --- Spot Rate Commodities ---
  [NotificationEvents.COMMODITY_CONFIG_CHANGED]: (payload: any): TemplatePayload => ({
    title: 'Commodity Config Changed',
    message: `Your allowed commodities configuration was updated by admin ${payload.actorName || payload.actor?.name || 'Admin'}.`,
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'trending-up',
    actions: [{ label: 'View Spot Rates', url: '/dashboard/spotrate' }],
  }),

  // --- Profile & Authentication ---
  [NotificationEvents.PASSWORD_CHANGED]: (payload: any): TemplatePayload => ({
    title: 'Password Changed Successfully',
    message: `The password for your account was changed by ${payload.actorName || payload.actor?.name || 'User'}.`,
    type: 'WARNING',
    category: 'SECURITY',
    sourceModule: 'AUTH',
    iconKey: 'key',
    actions: [{ label: 'Profile Settings', url: '/dashboard/settings' }],
  }),

  [NotificationEvents.PROFILE_UPDATED]: (payload: any): TemplatePayload => ({
    title: 'Profile Updated',
    message:
      payload.actorName || payload.actor?.name
        ? `Your company profile was updated by ${payload.actorName || payload.actor?.name}.`
        : 'Your company profile was updated successfully.',
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'user-check',
    actions: [{ label: 'Review Changes', url: '/dashboard/merchant-profile' }],
  }),

  [NotificationEvents.ADMIN_MERCHANT_PROFILE_UPDATED]: (payload: any): TemplatePayload => ({
    title: 'Merchant Profile Updated',
    message: `Merchant "${payload.companyName || 'Merchant'}" updated their company profile details.`,
    type: 'INFO',
    category: 'ADMIN',
    sourceModule: 'ADMIN',
    iconKey: 'user-check',
    actions: [{ label: 'View Merchants', url: '/admin' }],
  }),
};
