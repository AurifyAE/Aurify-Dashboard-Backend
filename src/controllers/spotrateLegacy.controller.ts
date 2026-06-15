import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import SpotRate, { ICommodity } from "../models/SpotRate";

const commodityFields = [
  "metal",
  "purity",
  "unit",
  "weight",
  "buyPremium",
  "sellPremium",
  "buyCharge",
  "sellCharge",
  "metal_name",
  "group",
];

const sanitizeCommodityData = (commodity: any = {}) =>
  commodityFields.reduce((sanitizedData: any, field) => {
    if (Object.prototype.hasOwnProperty.call(commodity, field)) {
      sanitizedData[field] = commodity[field];
    }
    return sanitizedData;
  }, {});

const defaultCommodities = [
  { symbol: "Gold", enabled: true },
  { symbol: "Silver", enabled: true },
  { symbol: "Platinum", enabled: true },
  { symbol: "Copper", enabled: true },
];

export const updateCommodity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.params.adminId as string;
    const commodityId = req.params.commodityId as string;
    const commodity = req.body;

    const updatedSpotRate = await SpotRate.findOneAndUpdate(
      { createdBy: new mongoose.Types.ObjectId(adminId), "commodities._id": new mongoose.Types.ObjectId(commodityId) },
      {
        $set: {
          "commodities.$": {
            metal: commodity.metal,
            purity: commodity.purity,
            unit: commodity.unit,
            weight: commodity.weight,
            _id: new mongoose.Types.ObjectId(commodityId),
            buyPremium: commodity.buyPremium ?? 0,
            sellPremium: commodity.sellPremium ?? 0,
            buyCharge: commodity.buyCharge ?? 0,
            sellCharge: commodity.sellCharge ?? 0,
            metal_name: commodity.metal_name?.trim() || null,
            group: commodity.group ?? "commodity",
          },
        },
      },
      { new: true }
    );

    if (!updatedSpotRate) {
      res.status(404).json({ message: "SpotRate or commodity not found" });
      return;
    }

    res.status(200).json({ message: "Commodity updated successfully", data: updatedSpotRate });
  } catch (error: any) {
    console.error("Error updating commodity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSpotRateCommodity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.params.adminId as string;
    const commodityId = req.params.commodityId as string;

    const result = await SpotRate.updateOne(
      { createdBy: new mongoose.Types.ObjectId(adminId) },
      { $pull: { commodities: { _id: new mongoose.Types.ObjectId(commodityId) } } }
    );

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: "Commodity not found or already deleted" });
      return;
    }

    res.status(200).json({ message: "Commodity deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting commodity:", error);
    res.status(500).json({ error: "An error occurred while deleting the commodity" });
  }
};

export const updateSpread = async (req: Request, res: Response): Promise<void> => {
  const { adminId, metal, type, value } = req.body;

  try {
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotRate = await SpotRate.findOne({ createdBy });

    if (!spotRate) {
      spotRate = new SpotRate({ createdBy });
    }

    let fieldName: string;
    if (type === "bid" || type === "ask") {
      fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Spread`;
    } else if (type === "low" || type === "high") {
      fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Margin`;
    } else {
      res.status(400).json({ message: "Invalid type specified" });
      return;
    }

    const updateObj = { [fieldName]: value };
    const updatedSpotRate = await SpotRate.findOneAndUpdate(
      { createdBy },
      { $set: updateObj },
      { new: true, upsert: true, runValidators: false }
    );

    if (!updatedSpotRate) {
      res.status(404).json({ message: "SpotRate not found and could not be created" });
      return;
    }

    res.status(200).json({ message: "Spread updated successfully", data: updatedSpotRate });
  } catch (error: any) {
    console.error("Error updating spread:", error);
    res.status(500).json({ message: "Error updating spread" });
  }
};

export const getCommodityController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userName = req.params.userName as string;
    if (!userName) {
      res.status(400).json({ success: false, message: "userName parameter is required." });
      return;
    }

    const user = await User.findOne({ email: userName.toLowerCase() });
    if (!user) {
      res.status(404).json({ success: false, message: "Admin data not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        userName: user.email,
        companyName: user.companyName,
        email: user.email,
        commodities: defaultCommodities,
      },
    });
  } catch (error: any) {
    console.error("Error fetching commodity details:", error);
    next(error);
  }
};

export const getSpotRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = req.params.adminId as string;
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotRates = await SpotRate.findOne({ createdBy });
    if (!spotRates) {
      res.status(204).json({ message: "Spot rates not found for this user" });
      return;
    }

    let hasCommodityNormalizationChanges = false;
    if (Array.isArray(spotRates.commodities)) {
      spotRates.commodities.forEach((commodity) => {
        if (!commodity.group) {
          commodity.group = "commodity";
          hasCommodityNormalizationChanges = true;
        }
      });
    }

    if (hasCommodityNormalizationChanges) {
      await spotRates.save();
    }

    res.json(spotRates);
  } catch (error: any) {
    console.error("Error fetching spot rates:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCommodity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { adminId, commodity } = req.body;
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotrate = await SpotRate.findOne({ createdBy });

    if (!spotrate) {
      spotrate = new SpotRate({ createdBy });
    }

    const normalizedCommodity = {
      ...sanitizeCommodityData(commodity),
      metal_name: commodity.metal_name?.trim() || null,
      group: commodity.group ?? "commodity",
    };

    spotrate.commodities.push(normalizedCommodity);
    const updatedSpotrate = await spotrate.save();

    res.status(200).json({
      message: "Commodity created successfully",
      data: updatedSpotrate,
    });
  } catch (error: any) {
    console.error("Error creating commodity:", error);
    res.status(500).json({ message: "Error creating commodity", error: error.message });
  }
};

export const getServerController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ selectedServerURL: "https://api.aurify.ae" });
  } catch (error: any) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getAdminDataController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userName = req.params.userName as string;
    if (!userName) {
      res.status(400).json({ success: false, message: "userName parameter is required." });
      return;
    }

    const user = await User.findOne({ email: userName.toLowerCase() });
    if (!user) {
      res.status(404).json({ success: false, message: "Admin data not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        userName: user.email,
        companyName: user.companyName,
        email: user.email,
        commodities: defaultCommodities,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin data:", error);
    next(error);
  }
};
