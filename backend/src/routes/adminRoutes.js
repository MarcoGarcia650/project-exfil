import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import {
  summary, listOpenReports, hideComment, dismissReports, listSubmissions, reviewSubmission,
  searchUsers, setSuspended, issueResetLink, listDrafts, publishDraft,
  rejectDraft, listRejected, restoreRejected,
} from "../controllers/adminController.js";

const router = Router();

// Everything under /admin needs a logged-in admin (role read from the DB).
router.use(requireAuth, requireAdmin);

router.get("/summary", summary);
router.get("/reports", listOpenReports);
router.post("/comments/:id/hide", hideComment);
router.post("/comments/:id/dismiss", dismissReports);
router.get("/submissions", listSubmissions);
router.post("/submissions/:id/review", reviewSubmission);
router.get("/users", searchUsers);
router.post("/users/:id/suspend", setSuspended);
router.post("/users/:id/unsuspend", setSuspended);
router.post("/users/:id/reset-link", issueResetLink);
router.get("/drafts", listDrafts);
router.post("/drafts/:id/publish", publishDraft);
router.post("/drafts/:id/reject", rejectDraft);
router.get("/rejected", listRejected);
router.post("/rejected/:id/restore", restoreRejected);

export default router;
