import { Router } from "express";
import { listPrograms, getProgram } from "../controllers/programController.js";

const router = Router();

// Public: anyone can browse and read listings; interacting needs an account.
router.get("/", listPrograms);
router.get("/:slug", getProgram);

export default router;
