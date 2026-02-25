import { Router } from "express";
import { getSpotRateSettings, updateSpotRateSettings } from "../controllers/spotrate.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.use(protect);
router.get("/settings", getSpotRateSettings);
router.patch("/settings", updateSpotRateSettings);

export default router;
