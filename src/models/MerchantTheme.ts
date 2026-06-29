import mongoose, { Document, Schema } from 'mongoose';

export interface IMerchantTheme extends Document {
  merchantId: string;
  themeId: string;
  name: string;
  category: string;
  customizations: Record<string, unknown>;
  installedAt: Date;
}

const MerchantThemeSchema = new Schema<IMerchantTheme>(
  {
    merchantId: { type: String, required: true, index: true },
    themeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    customizations: { type: Schema.Types.Mixed, default: {} },
    installedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MerchantThemeSchema.index({ merchantId: 1, themeId: 1 }, { unique: true });

const MerchantTheme = mongoose.model<IMerchantTheme>('MerchantTheme', MerchantThemeSchema);
export default MerchantTheme;
