"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const MerchantSchema = new mongoose_1.Schema({
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
    maxDevices: { type: Number, default: 2 },
    serviceEndDate: {
        type: Date,
        default: () => {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            return d;
        },
    },
}, { timestamps: true });
MerchantSchema.index({ userId: 1, merchantId: 1 });
const Merchant = mongoose_1.default.model('Merchant', MerchantSchema);
exports.default = Merchant;
