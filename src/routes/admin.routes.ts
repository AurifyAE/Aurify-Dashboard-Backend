import { Router } from "express";
import { getMerchants, updateMerchant, deleteMerchant } from "../controllers/admin.controller";
import { protect, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Only allow super_admin and admin
router.use(protect, requireRole("super_admin", "admin"));

// /api/admin/users
router.get("/users", getMerchants);
router.patch("/users/:id", updateMerchant);
router.delete("/users/:id", deleteMerchant);

export default router;
