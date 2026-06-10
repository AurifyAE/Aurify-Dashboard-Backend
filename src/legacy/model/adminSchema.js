import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  logo: { type: String },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordAccessKey: { type: String, required: true },
  contact: { type: String, required: true },
  whatsapp: { type: String, required: true },
  userType: { type: String, required: true },
  screenLimit: { type: Number, required: true },
  solutions: [
    {
      type: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    },
  ],
  features: [
    {
      name: { type: String },
      enabled: { type: Boolean, default: true },
    },
  ],
  commodities: [
    {
      symbol: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    },
  ],
  workCompletionDate: { type: Date },
  serviceStartDate: { type: Date, required: true },
  serviceEndDate: { type: Date },

  // Additional fields for admin features
  userDetails: {
    deviceIP: { type: String },
    location: { type: String },
    spreadValue: { type: String },
  },
  socialMediaLinks: {
    facebook: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    instagram: { type: String },
  },
  bankDetails: [
    {
      holderName: { type: String, default: null },
      bankName: { type: String, default: null },
      accountNumber: { type: String, default: null },
      iban: { type: String, default: null },
      ifsc: { type: String, default: null },
      swift: { type: String, default: null },
      branch: { type: String, default: null },
      city: { type: String, default: null },
      country: { type: String, default: null },
      logo: { type: String, default: null },
    },
  ],
});

const adminModel = mongoose.model("Admin", adminSchema);
export default adminModel;