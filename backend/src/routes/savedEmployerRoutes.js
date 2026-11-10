import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createSavedEmployer, updateSavedEmployerStatus, listSavedProgramIds } from "../controllers/savedEmployerController.js";

const router = Router();

router.get("/program-ids", requireAuth, listSavedProgramIds);
router.post("/", requireAuth, createSavedEmployer);
router.patch("/:id", requireAuth, updateSavedEmployerStatus);

export default router;
