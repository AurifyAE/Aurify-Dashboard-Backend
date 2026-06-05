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
exports.ScreenRecord = exports.PublishedLayoutVersion = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PublishedLayoutVersionSchema = new mongoose_1.Schema({
    layoutId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    status: { type: String, enum: ["published"], default: "published" },
    version: { type: Number, required: true },
    snapshot: { type: mongoose_1.Schema.Types.Mixed, required: true },
}, { timestamps: true });
const ScreenRecordSchema = new mongoose_1.Schema({
    merchantId: { type: String, required: true, index: true },
    screenSlug: { type: String, required: true, lowercase: true, trim: true },
    layoutId: { type: String, required: true, index: true },
    themeId: { type: String, trim: true },
    live: { type: Boolean, default: true, index: true },
    liveUrl: { type: String, required: true },
    assignedDevices: [{ type: String, trim: true }],
}, { timestamps: true });
PublishedLayoutVersionSchema.index({ merchantId: 1, layoutId: 1, version: -1 });
ScreenRecordSchema.index({ merchantId: 1, screenSlug: 1 }, { unique: true });
exports.PublishedLayoutVersion = mongoose_1.default.model("PublishedLayoutVersion", PublishedLayoutVersionSchema);
exports.ScreenRecord = mongoose_1.default.model("ScreenRecord", ScreenRecordSchema);
