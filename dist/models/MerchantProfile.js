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
const MerchantProfileSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
const MerchantProfile = mongoose_1.default.model("MerchantProfile", MerchantProfileSchema);
exports.default = MerchantProfile;
