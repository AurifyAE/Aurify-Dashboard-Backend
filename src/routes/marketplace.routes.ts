import { Router } from "express";
import {
  approveMerchant,
  getLiveScreen,
  getMyMerchant,
  getProfile,
  installTheme,
  listLayouts,
  listMerchantCommodities,
  listMerchantThemes,
  listNews,
  listThemes,
  publishLayout,
  registerMerchant,
  saveLayout,
  updateProfile,
  upsertMerchantCommodity,
  deleteMerchantCommodity,
  upsertNews,
} from "../controllers/marketplace.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.get("/live/:merchantSlug", getLiveScreen);
router.get("/live/:merchantSlug/:screenSlug", getLiveScreen);

router.use(protect);

router.get("/merchant/me", getMyMerchant);
router.post("/merchant/register", registerMerchant);
router.patch("/merchant/:merchantId/status", requireRole("super_admin", "admin"), approveMerchant);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

router.get("/themes", listThemes);
router.get("/themes/installed", listMerchantThemes);
router.post("/themes/:themeId/install", installTheme);

router.get("/layouts", listLayouts);
router.put("/layouts", saveLayout);
router.post("/layouts/:layoutId/publish", publishLayout);

router.get("/merchant-commodities", listMerchantCommodities);
router.post("/merchant-commodities", upsertMerchantCommodity);
router.patch("/merchant-commodities/:id", upsertMerchantCommodity);
router.delete("/merchant-commodities/:id", deleteMerchantCommodity);

router.get("/news", listNews);
router.post("/news", upsertNews);
router.patch("/news/:id", upsertNews);

export default router;
