import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { sendMessage, listMyMessages } from "../controllers/contactController.js";

const router = Router();

// No requireActiveAccount: a suspended user can still contact the admin.
router.post("/", requireAuth, sendMessage);
router.get("/mine", requireAuth, listMyMessages);

export default router;
