import { Router } from "express";
import { getOrganization } from "../controllers/organizationController.js";
import { listComments, createCommentFor } from "../controllers/commentController.js";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";

const router = Router();

// Public, like /programs.
router.get("/:slug", getOrganization);
// General discussion about the organization (same rules as listing comments).
router.get("/:slug/comments", listComments("organization"));
router.post("/:slug/comments", requireAuth, requireActiveAccount, createCommentFor("organization"));

export default router;
