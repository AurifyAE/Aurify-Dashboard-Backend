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
const CommoditySchema = new mongoose_1.Schema({
    adminId: {
        type: String,
        required: [true, "Admin ID is required"],
        index: true,
        trim: true,
    },
    metal: {
        type: String,
        required: [true, "Metal is required"],
        trim: true,
        uppercase: true,
        enum: {
            values: ["GOLD", "KILOBAR", "TTBAR", "SILVER"],
            message: "Metal must be GOLD, KILOBAR, TTBAR, or SILVER",
        },
    },
    purity: {
        type: String,
        required: [true, "Purity is required"],
        trim: true,
    },
    unit: {
        type: String,
        required: [true, "Unit is required"],
        trim: true,
    },
    buyPremium: { type: Number, default: 0, min: 0 },
    sellPremium: { type: Number, default: 0, min: 0 },
    sellCharges: { type: Number, default: 0, min: 0 },
    buyCharges: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
// Per-user list ordering
CommoditySchema.index({ adminId: 1, createdAt: -1 });
// Prevent duplicate commodities per user for same metal+purity+unit
CommoditySchema.index({ adminId: 1, metal: 1, purity: 1, unit: 1 }, { unique: true });
const Commodity = mongoose_1.default.model("Commodity", CommoditySchema);
exports.default = Commodity;
