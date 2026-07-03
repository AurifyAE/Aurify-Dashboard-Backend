import mongoose, { Document, Schema } from 'mongoose';

export interface INewsItem {
  _id?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: string;
  priority: number;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  placement: string;
}

export interface IMerchantNewsDoc extends Document {
  merchantId: string;
  news: INewsItem[];
}

const NewsItemSchema = new Schema<INewsItem>(
  {
    title: { type: String, trim: true, default: '' },
    content: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: ['Market News', 'Promotions', 'Offers', 'Announcements', 'Events'],
      default: 'Announcements',
    },
    priority: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    placement: {
      type: String,
      enum: ['Top Ticker', 'Bottom Ticker', 'Popup', 'Slider'],
      default: 'Bottom Ticker',
    },
  },
  { timestamps: true }
);

const MerchantNewsSchema = new Schema<IMerchantNewsDoc>(
  {
    merchantId: { type: String, required: true, index: true, unique: true },
    news: [NewsItemSchema],
  },
  { timestamps: true }
);

const MerchantNews = mongoose.model<IMerchantNewsDoc>('MerchantNews', MerchantNewsSchema);
export default MerchantNews;
