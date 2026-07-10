import { Request, Response } from 'express';
import Merchant from '../models/Merchant';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.middleware';
import { emitBusinessEvent, NotificationEvents } from '../helper/eventBus';

// Fetch all merchants for Admin Dashboard
export const getMerchants = async (req: Request, res: Response) => {
  try {
    const merchants = await Merchant.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: merchants });
  } catch (err) {
    console.error('Admin getMerchants error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch merchants' });
  }
};

// Update merchant details (status, limits, service end date)
export const updateMerchant = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
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

    const merchantBefore = await Merchant.findById(id).lean();
    if (!merchantBefore) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const updatedMerchant = await Merchant.findByIdAndUpdate(
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
      type: 'admin' as const,
    };

    // --- Dispatch Business Events ---
    // 1. Status Update
    if (status && status !== merchantBefore.status) {
      if (status === 'Active') {
        emitBusinessEvent(NotificationEvents.MERCHANT_APPROVED, {
          merchantId: updatedMerchant.merchantId,
          actorName: actor.name,
          actor,
        });
      } else if (status === 'Suspended') {
        emitBusinessEvent(NotificationEvents.MERCHANT_REJECTED, {
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
      emitBusinessEvent(NotificationEvents.LIMITS_UPDATED, {
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
      emitBusinessEvent(NotificationEvents.COMMODITY_CONFIG_CHANGED, {
        merchantId: updatedMerchant.merchantId,
        actorName: actor.name,
        actor,
      });
    }

    // 4. General Subscription / Package Update
    if (serviceEndDate || services || additionalFeatures) {
      emitBusinessEvent(NotificationEvents.SUBSCRIPTION_UPDATED, {
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

// Delete merchant and their user account completely
export const deleteMerchant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the merchant to get their userId
    const merchant = await Merchant.findById(id);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    // Delete the Merchant profile
    await Merchant.findByIdAndDelete(id);

    // Delete the User account
    await User.findByIdAndDelete(merchant.userId);

    res.status(200).json({ success: true, message: 'User and Merchant deleted successfully' });
  } catch (err) {
    console.error('Admin deleteMerchant error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// Reset user's password directly from admin panel
export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }

    const merchant = await Merchant.findById(id);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(merchant.userId, {
      $set: { passwordHash },
    });

    const actor = {
      id: authReq.user?.id || 'system',
      name: authReq.user?.companyName || 'Admin',
      type: 'admin' as const,
    };

    emitBusinessEvent(NotificationEvents.PASSWORD_CHANGED, {
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
