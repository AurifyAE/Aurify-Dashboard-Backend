import mongoose, { Document, Schema } from "mongoose";

export interface IMarketplaceTheme extends Document {
  name: string;
  category: string;
  thumbnail?: string;
  previewImage?: string;
  widgets: string[];
  colors: Record<string, string>;
  fonts: string[];
  active: boolean;
}

const MarketplaceThemeSchema = new Schema<IMarketplaceTheme>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Luxury Gold", "Modern Dark", "Corporate", "Jewellery Premium", "Arabic Premium"],
      index: true,
    },
    thumbnail: { type: String, trim: true },
    previewImage: { type: String, trim: true },
    widgets: [{ type: String, trim: true }],
    colors: { type: Schema.Types.Mixed, default: {} },
    fonts: [{ type: String, trim: true }],
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const MarketplaceTheme = mongoose.model<IMarketplaceTheme>("MarketplaceTheme", MarketplaceThemeSchema);
export default MarketplaceTheme;
