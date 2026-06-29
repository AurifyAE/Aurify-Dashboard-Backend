import mongoose, { Document, Schema } from 'mongoose';

export interface ICommodity {
  _id?: any;
  metal: string;
  purity: number;
  unit: number;
  weight: string;
  buyPremium: number;
  sellPremium: number;
  buyCharge: number;
  sellCharge: number;
  metal_name?: string | null;
  group: string;
}

export interface ISpotRate extends Document {
  createdBy: mongoose.Types.ObjectId;
  silverAskSpread: number;
  silverBidSpread: number;
  goldAskSpread: number;
  goldBidSpread: number;
  copperAskSpread: number;
  copperBidSpread: number;
  platinumAskSpread: number;
  platinumBidSpread: number;
  goldLowMargin: number;
  goldHighMargin: number;
  silverLowMargin: number;
  silverHighMargin: number;
  copperLowMargin: number;
  copperHighMargin: number;
  platinumLowMargin: number;
  platinumHighMargin: number;
  commodities: ICommodity[];
}

const CommoditySchema = new Schema({
  metal: { type: String },
  purity: { type: Number, default: 0 },
  unit: { type: Number, default: 0 },
  weight: { type: String },
  buyPremium: { type: Number, default: 0 },
  sellPremium: { type: Number, default: 0 },
  buyCharge: { type: Number, default: 0 },
  sellCharge: { type: Number, default: 0 },
  metal_name: { type: String, default: null },
  group: { type: String, default: 'commodity' },
});

const SpotRateSchema = new Schema<ISpotRate>({
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true,
  },
  silverAskSpread: { type: Number, default: 0 },
  silverBidSpread: { type: Number, default: 0 },
  goldAskSpread: { type: Number, default: 0 },
  goldBidSpread: { type: Number, default: 0 },
  copperAskSpread: { type: Number, default: 0 },
  copperBidSpread: { type: Number, default: 0 },
  platinumAskSpread: { type: Number, default: 0 },
  platinumBidSpread: { type: Number, default: 0 },
  goldLowMargin: { type: Number, default: 0 },
  goldHighMargin: { type: Number, default: 0 },
  silverLowMargin: { type: Number, default: 0 },
  silverHighMargin: { type: Number, default: 0 },
  copperLowMargin: { type: Number, default: 0 },
  copperHighMargin: { type: Number, default: 0 },
  platinumLowMargin: { type: Number, default: 0 },
  platinumHighMargin: { type: Number, default: 0 },
  commodities: [CommoditySchema],
});

const SpotRate = mongoose.model<ISpotRate>('SpotRate', SpotRateSchema);

export default SpotRate;
