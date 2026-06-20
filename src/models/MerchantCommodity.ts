import mongoose, { Document, Schema } from "mongoose";

export interface ICommodityItem {
  _id?: mongoose.Types.ObjectId;
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

export interface IMerchantCommodityDoc extends Document {
  merchantId: string;
  commodities: ICommodityItem[];
}

const CommodityItemSchema = new Schema<ICommodityItem>(
  {
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

const MerchantCommoditySchema = new Schema<IMerchantCommodityDoc>(
  {
    merchantId: { type: String, required: true, index: true, unique: true },
    commodities: [CommodityItemSchema]
  },
  { timestamps: true }
);

const MerchantCommodity = mongoose.model<IMerchantCommodityDoc>("MerchantCommodity", MerchantCommoditySchema);
export default MerchantCommodity;
