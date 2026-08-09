import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.get("/", requireAuth, getDashboard);

export default router;
