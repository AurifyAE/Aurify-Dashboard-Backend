import mongoose, { Document, Schema } from "mongoose";

export interface IMerchantCommodity extends Document {
  merchantId: string;
  name: string;
  metal: string;
  purity: string;
  weight: number;
  unit: string;
  buyPremium: number;
  sellPremium: number;
  buyCharge: number;
  sellCharge: number;
  image?: string;
  active: boolean;
}

const MerchantCommoditySchema = new Schema<IMerchantCommodity>(
  {
    merchantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    metal: { type: String, required: true, trim: true, uppercase: true },
    purity: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    buyPremium: { type: Number, default: 0 },
    sellPremium: { type: Number, default: 0 },
    buyCharge: { type: Number, default: 0 },
    sellCharge: { type: Number, default: 0 },
    image: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

MerchantCommoditySchema.index({ merchantId: 1, active: 1, createdAt: -1 });

const MerchantCommodity = mongoose.model<IMerchantCommodity>("MerchantCommodity", MerchantCommoditySchema);
export default MerchantCommodity;
