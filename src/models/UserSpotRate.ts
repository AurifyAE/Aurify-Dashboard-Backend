import mongoose, { Schema, Document } from 'mongoose';
import { ICommodity } from './SpotRate';

export interface ICategory {
  categoryId: string;
  commodities: ICommodity[];
  [spreadMarginField: string]: any;
}

export interface IUserSpotRate extends Document {
  createdBy: mongoose.Types.ObjectId;
  categories: ICategory[];
}

const CategorySchema = new Schema(
  {
    categoryId: { type: String, required: true },
    commodities: { type: Array, default: [] },
  },
  { strict: false }
);

const UserSpotRateSchema = new Schema<IUserSpotRate>({
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  categories: [CategorySchema],
});

export const UserSpotRateModel = mongoose.model<IUserSpotRate>('UserSpotRate', UserSpotRateSchema);
export default UserSpotRateModel;
