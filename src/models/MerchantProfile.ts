import mongoose, { Document, Schema } from "mongoose";

export interface IMerchantProfile extends Document {
  merchantId: string;
  banner?: string;
  about?: string;
  website?: string;
  address?: string;
  branches: Array<{ name: string; city?: string; address?: string; phone?: string }>;
  socialLinks: Record<string, string>;
  businessHours: Record<string, string>;
}

const MerchantProfileSchema = new Schema<IMerchantProfile>(
  {
    merchantId: { type: String, required: true, unique: true, index: true },
    banner: { type: String, trim: true },
    about: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    branches: [
      {
        name: { type: String, required: true, trim: true },
        city: { type: String, trim: true },
        address: { type: String, trim: true },
        phone: { type: String, trim: true },
      },
    ],
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      youtube: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    businessHours: {
      mondayFriday: { type: String, default: "09:00 - 18:00" },
      saturday: { type: String, default: "10:00 - 16:00" },
      sunday: { type: String, default: "Closed" },
    },
  },
  { timestamps: true }
);

const MerchantProfile = mongoose.model<IMerchantProfile>("MerchantProfile", MerchantProfileSchema);
export default MerchantProfile;
