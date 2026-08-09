import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { updateActionItem } from "../controllers/actionItemController.js";

const router = Router();

router.patch("/:id", requireAuth, updateActionItem);

export default router;
