import { Router } from "express";
import { listPrograms, getProgram } from "../controllers/programController.js";
import { listProgramComments, createComment } from "../controllers/commentController.js";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";

const router = Router();

// Public: anyone can browse and read listings and discussions;
// interacting needs an account.
router.get("/", listPrograms);
router.get("/:slug", getProgram);
router.get("/:slug/comments", listProgramComments);
router.post("/:slug/comments", requireAuth, requireActiveAccount, createComment);

export default router;
