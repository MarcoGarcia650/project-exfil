import { Router } from "express";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";
import { updateActionItem } from "../controllers/actionItemController.js";

const router = Router();

router.patch("/:id", requireAuth, requireActiveAccount, updateActionItem);

export default router;
