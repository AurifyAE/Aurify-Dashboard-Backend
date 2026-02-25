import { Router } from "express";
import {
  listCommodities,
  createCommodity,
  updateCommodity,
  deleteCommodity,
} from "../controllers/commodity.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.use(protect);

router.get("/", listCommodities);
router.post("/", createCommodity);
router.patch("/:id", updateCommodity);
router.delete("/:id", deleteCommodity);

export default router;
