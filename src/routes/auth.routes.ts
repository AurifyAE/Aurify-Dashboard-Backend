import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me  (protected)
router.get("/me", protect, getMe);

export default router;
