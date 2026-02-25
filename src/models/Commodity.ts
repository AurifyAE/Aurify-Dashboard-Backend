import mongoose, { Document, Schema } from "mongoose";

export interface ICommodity extends Document {
  adminId: string;
  metal: string;
  purity: string;
  unit: string;
  buyPremium: number;
  sellPremium: number;
  sellCharges: number;
  buyCharges: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommoditySchema = new Schema<ICommodity>(
  {
    adminId: {
      type: String,
      required: [true, "Admin ID is required"],
      index: true,
      trim: true,
    },
    metal: {
      type: String,
      required: [true, "Metal is required"],
      trim: true,
      uppercase: true,
      enum: {
        values: ["GOLD", "KILOBAR", "TTBAR", "SILVER"],
        message: "Metal must be GOLD, KILOBAR, TTBAR, or SILVER",
      },
    },
    purity: {
      type: String,
      required: [true, "Purity is required"],
      trim: true,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
    },
    buyPremium: { type: Number, default: 0, min: 0 },
    sellPremium: { type: Number, default: 0, min: 0 },
    sellCharges: { type: Number, default: 0, min: 0 },
    buyCharges: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Per-user list ordering
CommoditySchema.index({ adminId: 1, createdAt: -1 });

// Prevent duplicate commodities per user for same metal+purity+unit
CommoditySchema.index(
  { adminId: 1, metal: 1, purity: 1, unit: 1 },
  { unique: true }
);

const Commodity = mongoose.model<ICommodity>("Commodity", CommoditySchema);
export default Commodity;
