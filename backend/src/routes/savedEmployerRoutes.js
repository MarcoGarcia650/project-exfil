import { Router } from "express";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";
import { createSavedEmployer, updateSavedEmployerStatus, listSavedProgramIds } from "../controllers/savedEmployerController.js";

const router = Router();

router.get("/program-ids", requireAuth, listSavedProgramIds);
router.post("/", requireAuth, requireActiveAccount, createSavedEmployer);
router.patch("/:id", requireAuth, requireActiveAccount, updateSavedEmployerStatus);

export default router;
