import mongoose, { Document, Schema } from "mongoose";

export interface IMerchantNews extends Document {
  merchantId: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  placement: string;
}

const MerchantNewsSchema = new Schema<IMerchantNews>(
  {
    merchantId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Market News", "Promotions", "Offers", "Announcements", "Events"],
      default: "Announcements",
    },
    priority: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true, index: true },
    startDate: { type: Date },
    endDate: { type: Date },
    placement: {
      type: String,
      enum: ["Top Ticker", "Bottom Ticker", "Popup", "Slider"],
      default: "Bottom Ticker",
    },
  },
  { timestamps: true }
);

MerchantNewsSchema.index({ merchantId: 1, active: 1, priority: -1 });

const MerchantNews = mongoose.model<IMerchantNews>("MerchantNews", MerchantNewsSchema);
export default MerchantNews;
