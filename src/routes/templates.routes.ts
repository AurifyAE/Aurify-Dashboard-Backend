import { Router } from "express";
import {
  getTemplateConfig,
  upsertTemplateConfig,
} from "../controllers/templateConfig.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.use(protect);

router.get("/:templateId", getTemplateConfig);
router.put("/:templateId", upsertTemplateConfig);

export default router;

