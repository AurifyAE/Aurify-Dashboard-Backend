import mongoose from "mongoose";
import { retailGoldRateModel } from "../model/retailGoldRateSchema.js";

export const formatRetailGoldRate = (rate) => ({
  _id: rate._id,
  name: rate.name,
  rate: rate.rate,
  unit: rate.unit,
  displayOrder: rate.displayOrder,
  isActive: rate.isActive,
});

const getActiveRates = (doc) =>
  (doc?.rates || [])
    .filter((r) => r.isActive !== false)
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        String(a._id).localeCompare(String(b._id)),
    );

const seedEmptyRatesDoc = async (adminObjectId) => {
  await retailGoldRateModel.findOneAndUpdate(
    { adminId: adminObjectId },
    {
      $setOnInsert: { adminId: adminObjectId, rates: [] },
    },
    { upsert: true, new: true },
  );
};

/**
 * Fetch retail gold rates for an admin (one document per admin, rates in array).
 */
export const getRetailGoldRatesByAdminId = async (adminId) => {
  if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
    return { success: false, rates: null, message: "Valid adminId is required." };
  }

  const adminObjectId = new mongoose.Types.ObjectId(adminId);

  let doc = await retailGoldRateModel.findOne({ adminId: adminObjectId }).lean();

  if (!doc) {
    await seedEmptyRatesDoc(adminObjectId);
    doc = await retailGoldRateModel.findOne({ adminId: adminObjectId }).lean();
  }

  const rates = getActiveRates(doc).map(formatRetailGoldRate);

  return {
    success: true,
    rates,
    message: "Retail gold rates fetched successfully",
  };
};

/**
 * Replace all rates for an admin in a single document.
 */
export const replaceRetailGoldRatesForAdmin = async (adminId, ratesInput = []) => {
  if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
    return { success: false, rates: null, message: "Valid adminId is required." };
  }

  const adminObjectId = new mongoose.Types.ObjectId(adminId);

  const rates = ratesInput.map((item, index) => ({
    ...(item._id && mongoose.Types.ObjectId.isValid(item._id)
      ? { _id: new mongoose.Types.ObjectId(item._id) }
      : {}),
    name: String(item.name).trim(),
    rate: parseFloat(item.rate),
    unit: item.unit || "AED",
    displayOrder: item.displayOrder ?? index,
    isActive: item.isActive !== false,
  }));

  const doc = await retailGoldRateModel
    .findOneAndUpdate(
      { adminId: adminObjectId },
      { $set: { rates }, $setOnInsert: { adminId: adminObjectId } },
      { upsert: true, new: true, runValidators: true },
    )
    .lean();

  return {
    success: true,
    rates: getActiveRates(doc).map(formatRetailGoldRate),
    message: "Retail gold rates saved successfully",
  };
};
