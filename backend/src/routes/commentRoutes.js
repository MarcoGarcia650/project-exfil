import { Router } from "express";
import { getThread, reportComment } from "../controllers/commentController.js";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";

const router = Router();

router.get("/:id/thread", getThread);
router.post("/:id/reports", requireAuth, requireActiveAccount, reportComment);

export default router;
