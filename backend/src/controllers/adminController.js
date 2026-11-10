import { prisma } from "../lib/prisma.js";
import { createResetToken, resetLink, RESET_TOKEN_TTL_HOURS } from "../lib/passwordReset.js";
import { PUBLIC_SELECT } from "./programController.js";
import { parseListingInput } from "../lib/listingInput.js";
import { contentHashFor } from "../../prisma/lib/programContent.js";

// Every handler here runs behind requireAuth + requireAdmin.
// Moderation is reactive and status-only: no handler edits listing content
// or comment text. Listing changes still go staging → validator → import.

const NOTE_MAX = 1000;
const HIDE_REASON_MAX = 500;

function trimmedText(value, max, what, { required }) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return required ? { error: `${what} is required` } : { value: null };
  if (v.length > max) return { error: `${what} must be at most ${max} characters` };
  return { value: v };
}

// GET /admin/summary — counts for the admin tabs.
export async function summary(req, res) {
  const [openReports, pendingSubmissions, drafts, rejected, openMessages] = await Promise.all([
    prisma.comment.count({ where: { reports: { some: { status: "OPEN" } } } }),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.program.count({ where: { publishStatus: "DRAFT" } }),
    prisma.program.count({ where: { publishStatus: "REJECTED" } }),
    prisma.contactMessage.count({ where: { status: "OPEN" } }),
  ]);
  res.json({ openReports, pendingSubmissions, drafts, rejected, openMessages });
}

// ---------- Reports ----------

// GET /admin/reports — open reports grouped by comment, oldest report first.
// The admin sees the comment even if it's hidden, plus its author's account
// state, so they can decide whether to hide, suspend or dismiss.
export async function listOpenReports(req, res) {
  const comments = await prisma.comment.findMany({
    where: { reports: { some: { status: "OPEN" } } },
    select: {
      id: true, body: true, createdAt: true, hiddenAt: true, hiddenReason: true, parentId: true,
      author: { select: { id: true, username: true, suspendedAt: true, role: true } },
      program: { select: { slug: true, name: true } },
      organization: { select: { slug: true, name: true } },
      reports: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "asc" },
        select: { id: true, reason: true, createdAt: true, reporter: { select: { username: true } } },
      },
    },
  });
  comments.sort((a, b) => a.reports[0].createdAt - b.reports[0].createdAt);
  res.json(comments);
}

// POST /admin/comments/:id/hide — Body: { reason }
// Hides the comment (shown publicly as "Removed by admin"; replies stay) and
// marks its open reports ACTIONED. The reason stays admin-only.
export async function hideComment(req, res) {
  const reason = trimmedText(req.body?.reason, HIDE_REASON_MAX, "Reason", { required: true });
  if (reason.error) return res.status(400).json({ error: reason.error });

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.comment.updateMany({
      where: { id: req.params.id, hiddenAt: null },
      data: { hiddenAt: now, hiddenReason: reason.value },
    });
    const resolved = await tx.report.updateMany({
      where: { commentId: req.params.id, status: "OPEN" },
      data: { status: "ACTIONED", resolvedAt: now },
    });
    return { hidden: count, resolved: resolved.count };
  });

  if (result.hidden === 0 && result.resolved === 0) {
    const exists = await prisma.comment.count({ where: { id: req.params.id } });
    return res.status(exists ? 409 : 404).json({ error: exists ? "Already hidden" : "Comment not found" });
  }
  res.json({ ok: true, ...result });
}

// POST /admin/comments/:id/dismiss — closes the comment's open reports
// without hiding it.
export async function dismissReports(req, res) {
  const { count } = await prisma.report.updateMany({
    where: { commentId: req.params.id, status: "OPEN" },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  if (count === 0) return res.status(404).json({ error: "No open reports on this comment" });
  res.json({ ok: true, dismissed: count });
}

// ---------- Submissions ----------

// GET /admin/submissions?status=PENDING|ACCEPTED|REJECTED (default PENDING)
// Pending: oldest first (work the queue in order). Reviewed: newest first.
export async function listSubmissions(req, res) {
  const status = ["PENDING", "ACCEPTED", "REJECTED"].includes(req.query.status) ? req.query.status : "PENDING";
  const rows = await prisma.submission.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 100,
    select: {
      id: true, kind: true, body: true, sourceUrl: true, status: true, adminNote: true,
      createdAt: true, reviewedAt: true,
      program: { select: { slug: true, name: true, publishStatus: true } },
      submitter: { select: { id: true, username: true, email: true } },
    },
  });
  res.json(rows);
}

// POST /admin/submissions/:id/review — Body: { decision: ACCEPTED|REJECTED, note? }
// Status only. Accepting does NOT change any listing; make the change in
// staging, validate and re-import. The note is shown to the submitter.
export async function reviewSubmission(req, res) {
  const { decision } = req.body ?? {};
  if (!["ACCEPTED", "REJECTED"].includes(decision)) {
    return res.status(400).json({ error: "Decision must be ACCEPTED or REJECTED" });
  }
  const note = trimmedText(req.body?.note, NOTE_MAX, "Note", { required: false });
  if (note.error) return res.status(400).json({ error: note.error });

  const { count } = await prisma.submission.updateMany({
    where: { id: req.params.id, status: "PENDING" },
    data: { status: decision, adminNote: note.value, reviewedAt: new Date() },
  });
  if (count === 0) {
    const exists = await prisma.submission.count({ where: { id: req.params.id } });
    return res.status(exists ? 409 : 404).json({ error: exists ? "Already reviewed" : "Submission not found" });
  }
  res.json({ ok: true });
}

// ---------- Users ----------

const USER_SELECT = {
  id: true, email: true, username: true, role: true, suspendedAt: true, createdAt: true,
  _count: { select: { comments: true, reports: true, submissions: true } },
};

// GET /admin/users?q= — find by username (prefix) or email (contains),
// case-insensitive. Email lookup is admin-only: existing users may have no
// username, and the admin needs it to confirm who's asking for a reset.
export async function searchUsers(req, res) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.status(400).json({ error: "Type at least 2 characters" });
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { usernameKey: { startsWith: q.toLowerCase() } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: USER_SELECT,
  });
  res.json(users);
}

// POST /admin/users/:id/suspend and /unsuspend.
// Suspended = read-only, effective on the user's next request (requireAuth
// reads it from the DB). Admins can't be suspended here, which also stops
// an admin locking themselves out.
export async function setSuspended(req, res) {
  const suspend = req.path.endsWith("/suspend");
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (suspend && target.role === "ADMIN") {
    return res.status(400).json({ error: "Admins can't be suspended. Revoke admin first (make-admin.js --revoke)." });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { suspendedAt: suspend ? new Date() : null },
    select: USER_SELECT,
  });
  res.json(user);
}

// POST /admin/users/:id/reset-link
// Returns a one-time link (24h). It is shown once and never stored; only
// its hash is. Send it only through a channel you've confirmed belongs to
// the account owner. Issuing one voids any earlier unused link.
export async function issueResetLink(req, res) {
  const exists = await prisma.user.count({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: "User not found" });
  const raw = await createResetToken(req.params.id, { createdById: req.user.userId });
  res.json({ link: resetLink(raw), expiresInHours: RESET_TOKEN_TTL_HOURS });
}

// ---------- Drafts to review ----------

// GET /admin/drafts — every DRAFT with its full content and contentHash.
// The hash is sent back on approve, so the approval records exactly the
// content the reviewer saw.
export async function listDrafts(req, res) {
  const drafts = await prisma.program.findMany({
    where: { publishStatus: "DRAFT" },
    orderBy: [{ awaitingResearch: "asc" }, { organization: { name: "asc" } }, { name: "asc" }],
    select: { ...PUBLIC_SELECT, contentHash: true, awaitingResearch: true, updatedAt: true },
  });
  res.json(drafts);
}

// POST /admin/drafts/:id/publish — Body: { contentHash }
// The only way a listing becomes public. Refused when:
//   - the row isn't a DRAFT any more (409),
//   - it's awaiting research — not from verified staging data (409),
//   - its content changed since the reviewer loaded it (409: reload).
export async function publishDraft(req, res) {
  const { contentHash } = req.body ?? {};
  if (typeof contentHash !== "string" || !contentHash) {
    return res.status(400).json({ error: "contentHash is required" });
  }

  const { count } = await prisma.program.updateMany({
    where: { id: req.params.id, publishStatus: "DRAFT", awaitingResearch: false, contentHash },
    data: {
      publishStatus: "PUBLISHED",
      reviewedById: req.user.userId,
      reviewedAt: new Date(),
      reviewedContentHash: contentHash,
    },
  });
  if (count === 1) return res.json({ ok: true });

  const row = await prisma.program.findUnique({
    where: { id: req.params.id },
    select: { publishStatus: true, awaitingResearch: true, contentHash: true },
  });
  if (!row) return res.status(404).json({ error: "Program not found" });
  if (row.publishStatus !== "DRAFT") return res.status(409).json({ error: `Already ${row.publishStatus.toLowerCase()}` });
  if (row.awaitingResearch) {
    return res.status(409).json({ error: "This draft isn't from verified research yet. Verify it in staging and re-import first." });
  }
  return res.status(409).json({ error: "This listing changed since you loaded it. Reload and review it again." });
}

const REJECT_REASON_MAX = 1000;

// POST /admin/drafts/:id/reject — Body: { reason, contentHash }
// Moves a DRAFT to REJECTED: hidden everywhere (like a missing listing),
// out of the review queue, reason admin-only. Works for awaiting-research
// drafts too. To bring it back, fix staging and re-import (changed content
// returns it to DRAFT), or use "return to drafts" below.
export async function rejectDraft(req, res) {
  const reason = trimmedText(req.body?.reason, REJECT_REASON_MAX, "Reason", { required: true });
  if (reason.error) return res.status(400).json({ error: reason.error });
  const { contentHash } = req.body ?? {};
  if (typeof contentHash !== "string" || !contentHash) {
    return res.status(400).json({ error: "contentHash is required" });
  }

  const { count } = await prisma.program.updateMany({
    where: { id: req.params.id, publishStatus: "DRAFT", contentHash },
    data: { publishStatus: "REJECTED", rejectedAt: new Date(), rejectionReason: reason.value },
  });
  if (count === 1) return res.json({ ok: true });

  const row = await prisma.program.findUnique({ where: { id: req.params.id }, select: { publishStatus: true } });
  if (!row) return res.status(404).json({ error: "Program not found" });
  if (row.publishStatus !== "DRAFT") return res.status(409).json({ error: `Already ${row.publishStatus.toLowerCase()}` });
  return res.status(409).json({ error: "This listing changed since you loaded it. Reload and review it again." });
}

// GET /admin/rejected — rejected drafts, newest rejection first.
export async function listRejected(req, res) {
  const rows = await prisma.program.findMany({
    where: { publishStatus: "REJECTED" },
    orderBy: { rejectedAt: "desc" },
    select: {
      id: true, slug: true, name: true, officialSourceUrl: true, rejectedAt: true, rejectionReason: true,
      organization: { select: { name: true } },
    },
  });
  res.json(rows);
}

// POST /admin/rejected/:id/restore — undo a reject: back to DRAFT (still
// hidden) so it can be reviewed again. Status only; content is unchanged.
export async function restoreRejected(req, res) {
  const { count } = await prisma.program.updateMany({
    where: { id: req.params.id, publishStatus: "REJECTED" },
    data: { publishStatus: "DRAFT", rejectedAt: null, rejectionReason: null },
  });
  if (count === 0) {
    const exists = await prisma.program.count({ where: { id: req.params.id } });
    return res.status(exists ? 409 : 404).json({ error: exists ? "Not rejected" : "Program not found" });
  }
  res.json({ ok: true });
}

// ---------- Contact messages ----------

const REPLY_MAX = 3000;

// GET /admin/messages?status=OPEN|RESOLVED (default OPEN).
// Open: oldest first (work the queue in order). Resolved: newest first.
export async function listMessages(req, res) {
  const status = req.query.status === "RESOLVED" ? "RESOLVED" : "OPEN";
  const rows = await prisma.contactMessage.findMany({
    where: { status },
    orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
    take: 100,
    select: {
      id: true, subject: true, body: true, status: true, adminReply: true, createdAt: true, repliedAt: true,
      user: { select: { id: true, username: true, email: true, suspendedAt: true } },
    },
  });
  res.json(rows);
}

// POST /admin/messages/:id/reply — Body: { reply }
// Saves the reply (shown to the sender on "My messages") and resolves it.
// Once resolved it can't be re-answered; the user can send a new message.
export async function replyToMessage(req, res) {
  const reply = trimmedText(req.body?.reply, REPLY_MAX, "Reply", { required: true });
  if (reply.error) return res.status(400).json({ error: reply.error });

  const { count } = await prisma.contactMessage.updateMany({
    where: { id: req.params.id, status: "OPEN" },
    data: { status: "RESOLVED", adminReply: reply.value, repliedAt: new Date() },
  });
  if (count === 0) {
    const exists = await prisma.contactMessage.count({ where: { id: req.params.id } });
    return res.status(exists ? 409 : 404).json({ error: exists ? "Already answered" : "Message not found" });
  }
  res.json({ ok: true });
}

// ---------- Add listing ----------

// GET /admin/organizations — for the Add listing form's picker.
export async function listOrganizations(req, res) {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, websiteUrl: true },
  });
  res.json(orgs);
}

// POST /admin/listings — creates a DRAFT from the admin form.
// Same review path as imported listings: it appears in Drafts to review
// and only Approve & publish makes it public. contentHash uses the
// importer's function, so review and future imports treat it the same way.
export async function createListing(req, res) {
  const { error, data, warnings } = parseListingInput(req.body);
  if (error) return res.status(400).json({ error });

  const { organization, slug, ...fields } = data;
  let org;
  if (organization.existingSlug) {
    org = await prisma.organization.findUnique({ where: { slug: organization.existingSlug } });
    if (!org) return res.status(400).json({ error: "That organization doesn't exist" });
  } else if (await prisma.organization.findUnique({ where: { slug: organization.newOrg.slug } })) {
    return res.status(409).json({ error: "An organization with that slug already exists; pick it from the list" });
  }

  if (await prisma.program.findUnique({ where: { slug }, select: { id: true } })) {
    return res.status(409).json({ error: `A listing with the URL slug "${slug}" already exists` });
  }

  const orgSlug = org ? org.slug : organization.newOrg.slug;
  const contentHash = contentHashFor({ organizationSlug: orgSlug, ...fields });

  try {
    const program = await prisma.$transaction(async (tx) => {
      const orgId = org ? org.id : (await tx.organization.create({ data: organization.newOrg })).id;
      return tx.program.create({
        data: { ...fields, slug, organizationId: orgId, contentHash, publishStatus: "DRAFT" },
        select: { id: true, slug: true, publishStatus: true },
      });
    });
    res.status(201).json({ ...program, warnings });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "This organization already has a listing with that name" });
    }
    throw err;
  }
}
