'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.adminResetPassword =
  exports.deleteMerchant =
  exports.updateMerchant =
  exports.getMerchants =
    void 0;
const Merchant_1 = __importDefault(require('../models/Merchant'));
const User_1 = __importDefault(require('../models/User'));
const bcryptjs_1 = __importDefault(require('bcryptjs'));
const eventBus_1 = require('../helper/eventBus');
// Fetch all merchants for Admin Dashboard
const getMerchants = async (req, res) => {
  try {
    const merchants = await Merchant_1.default.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: merchants });
  } catch (err) {
    console.error('Admin getMerchants error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch merchants' });
  }
};
exports.getMerchants = getMerchants;
// Update merchant details (status, limits, service end date)
const updateMerchant = async (req, res) => {
  try {
    const authReq = req;
    const { id } = req.params;
    const {
      status,
      maxScreens,
      maxDevices,
      serviceEndDate,
      services,
      additionalFeatures,
      allowedCommodities,
    } = req.body;
    const merchantBefore = await Merchant_1.default.findById(id).lean();
    if (!merchantBefore) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }
    const updatedMerchant = await Merchant_1.default.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(status && { status }),
          ...(maxScreens !== undefined && { maxScreens }),
          ...(maxDevices !== undefined && { maxDevices }),
          ...(serviceEndDate && { serviceEndDate }),
          ...(services && { services }),
          ...(additionalFeatures && { additionalFeatures }),
          ...(allowedCommodities && { allowedCommodities }),
        },
      },
      { new: true, runValidators: true }
    );
    if (!updatedMerchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }
    const actor = {
      id: authReq.user?.id || 'system',
      name: authReq.user?.companyName || 'Admin',
      type: 'admin',
    };
    // --- Dispatch Business Events ---
    // 1. Status Update
    if (status && status !== merchantBefore.status) {
      if (status === 'Active') {
        (0, eventBus_1.emitBusinessEvent)(eventBus_1.NotificationEvents.MERCHANT_APPROVED, {
          merchantId: updatedMerchant.merchantId,
          actorName: actor.name,
          actor,
        });
      } else if (status === 'Suspended') {
        (0, eventBus_1.emitBusinessEvent)(eventBus_1.NotificationEvents.MERCHANT_REJECTED, {
          merchantId: updatedMerchant.merchantId,
          actorName: actor.name,
          actor,
        });
      }
    }
    // 2. Limit Enforcement Updates
    if (
      (maxScreens !== undefined && maxScreens !== merchantBefore.maxScreens) ||
      (maxDevices !== undefined && maxDevices !== merchantBefore.maxDevices)
    ) {
      (0, eventBus_1.emitBusinessEvent)(eventBus_1.NotificationEvents.LIMITS_UPDATED, {
        merchantId: updatedMerchant.merchantId,
        actorName: actor.name,
        maxScreens: updatedMerchant.maxScreens,
        maxDevices: updatedMerchant.maxDevices,
        actor,
      });
    }
    // 3. Allowed Commodities Update
    if (
      allowedCommodities &&
      JSON.stringify(allowedCommodities) !== JSON.stringify(merchantBefore.allowedCommodities)
    ) {
      (0, eventBus_1.emitBusinessEvent)(eventBus_1.NotificationEvents.COMMODITY_CONFIG_CHANGED, {
        merchantId: updatedMerchant.merchantId,
        actorName: actor.name,
        actor,
      });
    }
    // 4. General Subscription / Package Update
    if (serviceEndDate || services || additionalFeatures) {
      (0, eventBus_1.emitBusinessEvent)(eventBus_1.NotificationEvents.SUBSCRIPTION_UPDATED, {
        merchantId: updatedMerchant.merchantId,
        actorName: actor.name,
        actor,
      });
    }
    res.status(200).json({ success: true, data: updatedMerchant });
  } catch (err) {
    console.error('Admin updateMerchant error:', err);
    res.status(500).json({ success: false, message: 'Failed to update merchant' });
  }
};
exports.updateMerchant = updateMerchant;
// Delete merchant and their user account completely
const deleteMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the merchant to get their userId
    const merchant = await Merchant_1.default.findById(id);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }
    // Delete the Merchant profile
    await Merchant_1.default.findByIdAndDelete(id);
    // Delete the User account
    await User_1.default.findByIdAndDelete(merchant.userId);
    res.status(200).json({ success: true, message: 'User and Merchant deleted successfully' });
  } catch (err) {
    console.error('Admin deleteMerchant error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};
exports.deleteMerchant = deleteMerchant;
// Reset user's password directly from admin panel
const adminResetPassword = async (req, res) => {
  try {
    const authReq = req;
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }
    const merchant = await Merchant_1.default.findById(id);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await User_1.default.findByIdAndUpdate(merchant.userId, {
      $set: { passwordHash },
    });
    const actor = {
      id: authReq.user?.id || 'system',
      name: authReq.user?.companyName || 'Admin',
      type: 'admin',
    };
    (0, eventBus_1.emitBusinessEvent)(eventBus_1.NotificationEvents.PASSWORD_CHANGED, {
      merchantId: merchant.merchantId,
      actorName: actor.name,
      actor,
    });
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
exports.adminResetPassword = adminResetPassword;
