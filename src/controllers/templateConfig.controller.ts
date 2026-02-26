import { Response } from "express";
import TemplateConfig from "../models/TemplateConfig";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getTemplateConfig = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { templateId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const doc = await TemplateConfig.findOne({ userId, templateId }).lean();

    res.status(200).json({
      success: true,
      data:
        doc?.config ??
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
  } catch (err) {
    console.error("getTemplateConfig:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load template config" });
  }
};

export const upsertTemplateConfig = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
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

    const doc = await TemplateConfig.findOneAndUpdate(
      { userId, templateId },
      { $set: { config } },
      { new: true, upsert: true, runValidators: false },
    );

    res.status(200).json({
      success: true,
      data: doc.config,
    });
  } catch (err) {
    console.error("upsertTemplateConfig:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to save template config" });
  }
};

