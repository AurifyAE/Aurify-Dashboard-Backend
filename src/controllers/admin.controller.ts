import { Request, Response } from "express";
import Merchant from "../models/Merchant";
import User from "../models/User";
import bcrypt from "bcryptjs";

// Fetch all merchants for Admin Dashboard
export const getMerchants = async (req: Request, res: Response) => {
  try {
    const merchants = await Merchant.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: merchants });
  } catch (err) {
    console.error("Admin getMerchants error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch merchants" });
  }
};

// Update merchant details (status, limits, service end date)
export const updateMerchant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      status, maxScreens, maxDevices, serviceEndDate, 
      services, additionalFeatures, allowedCommodities 
    } = req.body;

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
      res.status(404).json({ success: false, message: "Merchant not found" });
      return;
    }

    res.status(200).json({ success: true, data: updatedMerchant });
  } catch (err) {
    console.error("Admin updateMerchant error:", err);
    res.status(500).json({ success: false, message: "Failed to update merchant" });
  }
};

// Delete merchant and their user account completely
export const deleteMerchant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find the merchant to get their userId
    const merchant = await Merchant.findById(id);
    if (!merchant) {
      res.status(404).json({ success: false, message: "Merchant not found" });
      return;
    }

    // Delete the Merchant profile
    await Merchant.findByIdAndDelete(id);

    // Delete the User account
    await User.findByIdAndDelete(merchant.userId);

    res.status(200).json({ success: true, message: "User and Merchant deleted successfully" });
  } catch (err) {
    console.error("Admin deleteMerchant error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// Reset user's password directly from admin panel
export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      return;
    }

    const merchant = await Merchant.findById(id);
    if (!merchant) {
      res.status(404).json({ success: false, message: "Merchant not found" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    await User.findByIdAndUpdate(merchant.userId, {
      $set: { passwordHash }
    });

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Admin reset password error:", err);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
};
