import { Router } from "express";
import { listEmployers } from "../controllers/employerController.js";

const router = Router();

router.get("/", listEmployers);

export default router;
