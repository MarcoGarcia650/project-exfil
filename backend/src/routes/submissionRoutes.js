import { Router } from "express";
import { createSubmission, listMySubmissions } from "../controllers/submissionController.js";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";

const router = Router();

router.get("/mine", requireAuth, listMySubmissions);
router.post("/", requireAuth, requireActiveAccount, createSubmission);

export default router;
