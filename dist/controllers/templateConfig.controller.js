"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertTemplateConfig = exports.getTemplateConfig = void 0;
const TemplateConfig_1 = __importDefault(require("../models/TemplateConfig"));
const getTemplateConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { templateId } = req.params;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const doc = await TemplateConfig_1.default.findOne({ userId, templateId }).lean();
        res.status(200).json({
            success: true,
            data: doc?.config ??
                {
                    templateId,
                    backgroundColor: "#0b1120",
                    textColor: "#ffffff",
                    fontFamily: "Inter",
                    elements: [
                        { key: "spotRate", enabled: true },
                        { key: "commodities", enabled: true },
                    ],
                },
        });
    }
    catch (err) {
        console.error("getTemplateConfig:", err);
        res
            .status(500)
            .json({ success: false, message: "Failed to load template config" });
    }
};
exports.getTemplateConfig = getTemplateConfig;
const upsertTemplateConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { templateId } = req.params;
        const { config } = req.body;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        if (!config) {
            res.status(400).json({
                success: false,
                message: "Config payload is required",
            });
            return;
        }
        const doc = await TemplateConfig_1.default.findOneAndUpdate({ userId, templateId }, { $set: { config } }, { new: true, upsert: true, runValidators: false });
        res.status(200).json({
            success: true,
            data: doc.config,
        });
    }
    catch (err) {
        console.error("upsertTemplateConfig:", err);
        res
            .status(500)
            .json({ success: false, message: "Failed to save template config" });
    }
};
exports.upsertTemplateConfig = upsertTemplateConfig;
