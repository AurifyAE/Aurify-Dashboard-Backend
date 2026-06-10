import { Router } from "express";
import {
  activateDeviceController,
  getSpotrateDetails,
  getCurrentNews,
  getServerDetails,
  getCommodities,
  getPremiumDiscounts,
  fetchScreenSlider,
  getAllLondonFixController,
  getRetailGoldRates,
} from "../../controllers/device/deviceController.js";
import { deviceManagementMiddleware } from "../../middleware/deviceManage.js";

const router = Router();

router.get("/tv-screen", deviceManagementMiddleware, activateDeviceController);
router.get("/get-spotrates/:adminId", getSpotrateDetails);
router.get("/get-news/:adminId", getCurrentNews);
router.get("/get-commodities/:adminId", getCommodities);
router.get("/get-server", getServerDetails);
router.get("/get-premium-discount/:adminId", getPremiumDiscounts);
router.get("/tv-sliders/:adminId", fetchScreenSlider);
router.get("/london-fix", getAllLondonFixController);
// retail gold rate (standalone module)
router.get("/retail-gold-rate/:adminId", getRetailGoldRates);


export default router;