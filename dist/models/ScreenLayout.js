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
const ScreenLayoutSchema = new mongoose_1.Schema({
    layoutId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    screenSlug: { type: String, required: true, lowercase: true, trim: true, default: "main" },
    themeId: { type: String, trim: true },
    header: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    body: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    sidebar: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    footer: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    widgets: [{ type: String, trim: true }],
    styles: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
}, { timestamps: true });
ScreenLayoutSchema.index({ merchantId: 1, screenSlug: 1, status: 1 });
const ScreenLayout = mongoose_1.default.model("ScreenLayout", ScreenLayoutSchema);
exports.default = ScreenLayout;
