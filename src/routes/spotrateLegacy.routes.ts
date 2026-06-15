import { Router } from "express";
import {
  updateSpread,
  getSpotRate,
  getCommodityController,
  createCommodity,
  updateCommodity,
  deleteSpotRateCommodity,
  getServerController,
  getAdminDataController,
} from "../controllers/spotrateLegacy.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Protect all routes (as they are called from the authenticated dashboard)
router.use(protect);

router.post("/update-spread", updateSpread);
router.get("/spotrates/:adminId", getSpotRate);
router.get("/commodities/:userName", getCommodityController);
router.post("/spotrate-commodity", createCommodity);
router.patch("/spotrate-commodity/:adminId/:commodityId", updateCommodity);
router.delete("/commodities/:adminId/:commodityId", deleteSpotRateCommodity);
router.get("/server-url", getServerController);
router.get("/data/:userName", getAdminDataController);

export default router;
