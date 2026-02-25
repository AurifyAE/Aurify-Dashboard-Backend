import mongoose, { Document, Schema } from "mongoose";

export interface ISpotRateSettings extends Document {
  userId: string;
  goldBidSpread: number;
  goldAskSpread: number;
  silverBidSpread: number;
  silverAskSpread: number;
  updatedAt: Date;
}

const SpotRateSettingsSchema = new Schema<ISpotRateSettings>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    goldBidSpread: { type: Number, default: 0 },
    goldAskSpread: { type: Number, default: 0.5 },
    silverBidSpread: { type: Number, default: 0 },
    silverAskSpread: { type: Number, default: 0.05 },
  },
  { timestamps: true }
);

const SpotRateSettings = mongoose.model<ISpotRateSettings>(
  "SpotRateSettings",
  SpotRateSettingsSchema
);
export default SpotRateSettings;
