import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { getMetals } from "../helper/admin/spotRateHelper";
import { getCommodity } from "../helper/admin/adminHelper";
import spotRateModel from "../models/SpotRate";

class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const createAppError = (message: string, statusCode: number) => {
  return new AppError(message, statusCode);
};

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

export const updateCommodity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const adminId = req.params.adminId as string;
    const commodityId = req.params.commodityId as string;
    const commodity = req.body;
    
    const updatedSpotRate = await spotRateModel.findOneAndUpdate(
      { createdBy: new mongoose.Types.ObjectId(adminId), "commodities._id": new mongoose.Types.ObjectId(commodityId) },
      {
        $set: {
          "commodities.$": {
            metal: commodity.metal,
            purity: commodity.purity,
            unit: commodity.unit,
            weight: commodity.weight,
            _id: new mongoose.Types.ObjectId(commodityId),
            buyPremium: commodity.buyPremium,
            sellPremium: commodity.sellPremium,
            buyCharge: commodity.buyCharge,
            sellCharge: commodity.sellCharge,
            metal_name: commodity.metal_name?.trim() || null,
            group: commodity.group ?? "group1",
          },
        },
      },
      { new: true },
    );

    if (!updatedSpotRate) {
      return res.status(404).json({ message: 'SpotRate or commodity not found' });
    }

    res.status(200).json({ message: 'Commodity updated successfully', data: updatedSpotRate });
  } catch (error) {
    console.error('Error updating commodity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSpotRateCommodity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const adminId = req.params.adminId as string;
    const commodityId = req.params.commodityId as string;

    const result = await spotRateModel.updateOne(
      { createdBy: new mongoose.Types.ObjectId(adminId) }, 
      { $pull: { commodities: { _id: new mongoose.Types.ObjectId(commodityId) } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Commodity not found or already deleted' });
    }

    res.status(200).json({ message: 'Commodity deleted successfully' });
  } catch (error) {
    console.error('Error deleting commodity:', error);
    res.status(500).json({ error: 'An error occurred while deleting the commodity' });
  }
};

export const updateSpread = async (req: Request, res: Response): Promise<any> => {
  const { adminId, metal, type, value } = req.body;

  try {
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotRate = await spotRateModel.findOne({ createdBy });

    if (!spotRate) {
      spotRate = new spotRateModel({
        createdBy,
      });
    }

    let fieldName;
    if (type === "bid" || type === "ask") {
      fieldName = `${metal.toLowerCase()}${
        type.charAt(0).toUpperCase() + type.slice(1)
      }Spread`;
    } else if (type === "low" || type === "high") {
      fieldName = `${metal.toLowerCase()}${
        type.charAt(0).toUpperCase() + type.slice(1)
      }Margin`;
    } else {
      return res.status(400).json({ message: "Invalid type specified" });
    }
    const updateObj = { [fieldName]: value };
    const updatedSpotRate = await spotRateModel.findOneAndUpdate(
      { createdBy },
      { $set: updateObj },
      { new: true, upsert: true, runValidators: false }
    );
    if (!updatedSpotRate) {
      return res
        .status(404)
        .json({ message: "SpotRate not found and could not be created" });
    }

    res
      .status(200)
      .json({ message: "Spread updated successfully", data: updatedSpotRate });
  } catch (error) {
    console.error("Error updating spread:", error);
    res.status(500).json({ message: "Error updating spread" });
  }
};

export const getCommodityController = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userName = req.params.userName as string;
    if (!userName) {
      throw createAppError("userName parameter is required.", 400);
    }

    const commodityData = await getCommodity(userName);

    if (!commodityData) {
      throw createAppError("Admin data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: commodityData,
    });
  } catch (error) {
    console.log("Error:", (error as Error).message);
    next(error);
  }
};

export const getSpotRate = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const adminId = req.params.adminId as string;
    const createdBy = new mongoose.Types.ObjectId(adminId);
    const spotRates = await spotRateModel.findOne({ createdBy });
    if (!spotRates) {
      return res
        .status(204)
        .json({ message: "Spot rates not found for this user" });
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
  } catch (error) {
    console.error("Error fetching spot rates:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCommodity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {    
  try {
    const { adminId, commodity } = req.body;
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotrate = await spotRateModel.findOne({ createdBy });

    if (!spotrate) {
      spotrate = new spotRateModel({
        createdBy,
      });
    }
    const normalizedCommodity = {
      ...sanitizeCommodityData(commodity),
      metal_name: commodity.metal_name?.trim() || null,
      group: commodity.group ?? "commodity",
    };
    spotrate.commodities.push(normalizedCommodity);
    const updatedSpotrate = await spotrate.save();
    res
      .status(200)
      .json({
        message: "Commodity created successfully",
        data: updatedSpotrate,
      });
  } catch (error: any) {
    console.error("Error creating commodity:", error);
    res
      .status(500)
      .json({ message: "Error creating commodity", error: error.message });
  }
};

export const getMetalCommodity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userName = req.params.userName as string;
    if (!userName) {
      throw createAppError("Id is required.", 400);
    }

    const metalData = await getMetals(userName);

    if (!metalData) {
      throw createAppError("Metal data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: metalData,
    });
  } catch (error) {
    console.log("Error:", (error as Error).message);
    next(error);
  }
};
