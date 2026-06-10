import mongoose from "mongoose";

const retailGoldRateItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      default: "AED",
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const retailGoldRateSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
      index: true,
    },
    rates: {
      type: [retailGoldRateItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const retailGoldRateModel = mongoose.model("RetailGoldRate", retailGoldRateSchema);

export { retailGoldRateModel, retailGoldRateItemSchema };
