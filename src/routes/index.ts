import { Router } from "express";
import authRoutes from "./auth.routes";
import spotrateRoutes from "./spotrate.routes";
import templateRoutes from "./templates.routes";
import marketplaceRoutes from "./marketplace.routes";
import spotrateLegacyRoutes from "./spotrateLegacy.routes";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "API Working Fine ✅" });
});

router.use("/auth", authRoutes);
router.use("/spotrate", spotrateRoutes);
router.use("/templates", templateRoutes);
router.use("/marketplace", marketplaceRoutes);
router.use("/", spotrateLegacyRoutes);

export default router;
