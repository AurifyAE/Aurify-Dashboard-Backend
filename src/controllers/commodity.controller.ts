import { Response } from "express";
import Commodity from "../models/Commodity";
import { AuthRequest } from "../middlewares/auth.middleware";

const getUserId = (req: AuthRequest): string => {
  const id = req.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
};

// GET /api/commodities — list commodities for admin
export const listCommodities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const commodities = await Commodity.find({ adminId: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: commodities.map((c) => ({
        id: c._id.toString(),
        metal: c.metal,
        purity: c.purity,
        unit: c.unit,
        buyPremium: c.buyPremium,
        sellPremium: c.sellPremium,
        sellCharges: c.sellCharges,
        buyCharges: c.buyCharges,
      })),
    });
  } catch (err) {
    console.error("listCommodities:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch commodities",
    });
  }
};

// POST /api/commodities — create commodity
export const createCommodity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { metal, purity, unit, buyPremium, sellPremium, sellCharges, buyCharges } = req.body;

    if (!metal || !purity || unit === undefined || unit === null) {
      res.status(400).json({
        success: false,
        message: "metal, purity, and unit are required",
      });
      return;
    }

    const normalizedMetal = String(metal).trim().toUpperCase();
    const normalizedPurity = String(purity).trim();
    const normalizedUnit = String(unit).trim();

    // Check for existing commodity with same user + metal + purity + unit
    const existing = await Commodity.findOne({
      adminId: userId,
      metal: normalizedMetal,
      purity: normalizedPurity,
      unit: normalizedUnit,
    }).lean();

    if (existing) {
      res.status(409).json({
        success: false,
        message: "This commodity already exists",
      });
      return;
    }

    const doc = await Commodity.create({
      adminId: userId,
      metal: normalizedMetal,
      purity: normalizedPurity,
      unit: normalizedUnit,
      buyPremium: Number(buyPremium) || 0,
      sellPremium: Number(sellPremium) || 0,
      sellCharges: Number(sellCharges) || 0,
      buyCharges: Number(buyCharges) || 0,
    });

    res.status(201).json({
      success: true,
      data: {
        id: doc._id.toString(),
        metal: doc.metal,
        purity: doc.purity,
        unit: doc.unit,
        buyPremium: doc.buyPremium,
        sellPremium: doc.sellPremium,
        sellCharges: doc.sellCharges,
        buyCharges: doc.buyCharges,
      },
    });
  } catch (err: any) {
    console.error("createCommodity:", err);
    // Mongoose validation error
    if (err.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: err.message || "Validation failed",
        errors: err.errors,
      });
      return;
    }
    // Duplicate key error for unique index (adminId+metal+purity+unit)
    if (err.code === 11000) {
      res.status(409).json({
        success: false,
        message: "This commodity already exists with the same metal, purity and unit.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to create commodity",
    });
  }
};

// PATCH /api/commodities/:id — update commodity
export const updateCommodity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const update: Record<string, number> = {};
    const allowed = ["buyPremium", "sellPremium", "sellCharges", "buyCharges"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const n = Number(req.body[key]);
        update[key] = Number.isFinite(n) ? n : 0;
      }
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
      return;
    }

    const doc = await Commodity.findOneAndUpdate(
      { _id: id, adminId: userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Commodity not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: doc._id.toString(),
        metal: doc.metal,
        purity: doc.purity,
        unit: doc.unit,
        buyPremium: doc.buyPremium,
        sellPremium: doc.sellPremium,
        sellCharges: doc.sellCharges,
        buyCharges: doc.buyCharges,
      },
    });
  } catch (err) {
    console.error("updateCommodity:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update commodity",
    });
  }
};

// DELETE /api/commodities/:id
export const deleteCommodity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const doc = await Commodity.findOneAndDelete({ _id: id, adminId: userId });

    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Commodity not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Commodity deleted",
    });
  } catch (err) {
    console.error("deleteCommodity:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete commodity",
    });
  }
};
