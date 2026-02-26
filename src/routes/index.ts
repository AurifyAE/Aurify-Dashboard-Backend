import { Router } from "express";
import authRoutes from "./auth.routes";
import commodityRoutes from "./commodity.routes";
import spotrateRoutes from "./spotrate.routes";
import templateRoutes from "./templates.routes";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "API Working Fine ✅" });
});

router.use("/auth", authRoutes);
router.use("/commodities", commodityRoutes);
router.use("/spotrate", spotrateRoutes);
router.use("/templates", templateRoutes);

export default router;
