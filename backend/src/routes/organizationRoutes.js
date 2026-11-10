import { Router } from "express";
import { getOrganization } from "../controllers/organizationController.js";

const router = Router();

// Public, like /programs.
router.get("/:slug", getOrganization);

export default router;
