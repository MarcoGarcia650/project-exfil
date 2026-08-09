import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createSavedEmployer, updateSavedEmployerStatus } from "../controllers/savedEmployerController.js";

const router = Router();

router.post("/", requireAuth, createSavedEmployer);
router.patch("/:id", requireAuth, updateSavedEmployerStatus);

export default router;
