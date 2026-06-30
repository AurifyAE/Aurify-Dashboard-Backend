import mongoose, { Document, Schema } from 'mongoose';

export type MerchantStatus = 'Pending' | 'Active' | 'Suspended';

export interface IMerchant extends Document {
  merchantId: string;
  userId: string;
  companyName: string;
  slug: string;
  logo?: string;
  businessType?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  status: MerchantStatus;
  services: {
    tvDisplay: boolean;
    mobileApp: boolean;
    website: boolean;
  };
  additionalFeatures: string[];
  allowedCommodities: string[];
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  visibility: {
    showCompanyLogo: boolean;
    showCompanyName: boolean;
    showSpotRates: boolean;
    showCommodities: boolean;
    showNews: boolean;
    showClock: boolean;
    showLondonFix: boolean;
  };
  packageId?: string;
  maxScreens: number;
  maxDevices: number;
  serviceEndDate: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    merchantId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'],
    },
    logo: { type: String, trim: true },
    businessType: { type: String, trim: true },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Suspended'],
      default: 'Pending',
      index: true,
    },
    services: {
      tvDisplay: { type: Boolean, default: false },
      mobileApp: { type: Boolean, default: false },
      website: { type: Boolean, default: false },
    },
    additionalFeatures: { type: [String], default: [] },
    allowedCommodities: { type: [String], default: ['Gold', 'Silver'] },
    branding: {
      primaryColor: { type: String, default: '#d4a017' },
      secondaryColor: { type: String, default: '#111827' },
      accentColor: { type: String, default: '#38bdf8' },
      fontFamily: { type: String, default: 'Inter' },
    },
    visibility: {
      showCompanyLogo: { type: Boolean, default: true },
      showCompanyName: { type: Boolean, default: true },
      showSpotRates: { type: Boolean, default: true },
      showCommodities: { type: Boolean, default: true },
      showNews: { type: Boolean, default: true },
      showClock: { type: Boolean, default: true },
      showLondonFix: { type: Boolean, default: false },
    },
    packageId: { type: String, trim: true },
    maxScreens: { type: Number, default: 1 },
    maxDevices: { type: Number, default: 1 },
    serviceEndDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d;
      },
    },
  },
  { timestamps: true }
);

MerchantSchema.index({ userId: 1, merchantId: 1 });

const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);
export default Merchant;
