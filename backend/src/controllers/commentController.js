import { prisma } from "../lib/prisma.js";
import { isPublicStatus, PUBLIC_STATUSES } from "../lib/publishStatus.js";
import { checkPostingLimit } from "../lib/postingLimit.js";
import {
  parseCommentBody, parseReportReason, COMMENTS_PAGE_SIZE, THREAD_DEPTH,
  encodeCursor, decodeCursor, afterCursor,
} from "../lib/communityRules.js";

const ORDER = [{ createdAt: "asc" }, { id: "asc" }];

// Prisma include for a comment plus `levels` levels of replies (each level
// capped at one page, with a count so the UI knows when there are more).
function nodeInclude(levels) {
  return {
    author: { select: { username: true } },
    _count: { select: { replies: true } },
    ...(levels > 0 && {
      replies: { orderBy: ORDER, take: COMMENTS_PAGE_SIZE, include: nodeInclude(levels - 1) },
    }),
  };
}

// Public shape. Hidden comments keep their place in the thread ("Removed by
// admin") but expose no body or author; their replies stay visible.
// hiddenReason is admin-only and never leaves the server here.
function serialize(c) {
  const hidden = c.hiddenAt !== null;
  return {
    id: c.id,
    parentId: c.parentId,
    createdAt: c.createdAt,
    hidden,
    body: hidden ? null : c.body,
    author: hidden ? null : { username: c.author.username },
    replyCount: c._count.replies,
    replies: (c.replies ?? []).map(serialize),
  };
}

// Comments live on public listings only: PUBLISHED, or ARCHIVED (which
// stay open for discussion). DRAFT/REJECTED look the same as missing.
// A discussion target is a public program listing or an organization
// with at least one public program (the same rule as its public page).
// Returns { kind, id, slug, name, where } or null (treated as 404).
async function findTarget(kind, slug) {
  if (kind === "program") {
    const program = await prisma.program.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, publishStatus: true },
    });
    if (!program || !isPublicStatus(program.publishStatus)) return null;
    return { kind, id: program.id, slug: program.slug, name: program.name, where: { programId: program.id } };
  }
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, _count: { select: { programs: { where: { publishStatus: { in: PUBLIC_STATUSES } } } } } },
  });
  if (!org || org._count.programs === 0) return null;
  return { kind, id: org.id, slug: org.slug, name: org.name, where: { organizationId: org.id } };
}

const NOT_FOUND = { program: "Program not found", organization: "Organization not found" };

// Is the thing a stored comment hangs off still public?
const TARGET_SELECT = {
  program: { select: { slug: true, name: true, publishStatus: true } },
  organization: {
    select: { slug: true, name: true, _count: { select: { programs: { where: { publishStatus: { in: PUBLIC_STATUSES } } } } } },
  },
};
function publicTargetOf(comment) {
  if (comment.program) {
    return isPublicStatus(comment.program.publishStatus)
      ? { kind: "program", slug: comment.program.slug, name: comment.program.name }
      : null;
  }
  if (comment.organization) {
    return comment.organization._count.programs > 0
      ? { kind: "organization", slug: comment.organization.slug, name: comment.organization.name }
      : null;
  }
  return null;
}

// Fetches one page (+1 to detect more) and builds { items, nextCursor }.
async function page(where, cursorParam, include) {
  const cursor = decodeCursor(cursorParam);
  const rows = await prisma.comment.findMany({
    where: { ...where, ...afterCursor(cursor) },
    orderBy: ORDER,
    take: COMMENTS_PAGE_SIZE + 1,
    include,
  });
  const more = rows.length > COMMENTS_PAGE_SIZE;
  const items = rows.slice(0, COMMENTS_PAGE_SIZE);
  return { items: items.map(serialize), nextCursor: more ? encodeCursor(items.at(-1)) : null };
}

// GET /programs/:slug/comments and /organizations/:slug/comments — public.
// Top-level comments oldest-first, each with up to THREAD_DEPTH levels of replies.
export function listComments(kind) {
  return async (req, res) => {
    const target = await findTarget(kind, req.params.slug);
    if (!target) return res.status(404).json({ error: NOT_FOUND[kind] });

    const total = await prisma.comment.count({ where: target.where });
    const { items, nextCursor } = await page({ ...target.where, parentId: null }, req.query.cursor, nodeInclude(THREAD_DEPTH));
    res.json({ comments: items, nextCursor, total });
  };
}
export const listProgramComments = listComments("program");

// GET /comments/:id/thread?cursor=… — public.
// A view rooted at one comment ("continue thread" / "more replies"): the
// root, then its direct replies paged, each with THREAD_DEPTH - 1 more levels.
export async function getThread(req, res) {
  const root = await prisma.comment.findUnique({
    where: { id: req.params.id },
    include: { ...nodeInclude(0), ...TARGET_SELECT },
  });
  const target = root && publicTargetOf(root);
  if (!target) return res.status(404).json({ error: "Comment not found" });

  const { items, nextCursor } = await page({ parentId: root.id }, req.query.cursor, nodeInclude(THREAD_DEPTH - 1));
  res.json({
    target,
    // Kept for older clients: set only for listing discussions.
    ...(target.kind === "program" && { program: { slug: target.slug, name: target.name } }),
    root: { ...serialize(root), replies: items },
    nextCursor,
  });
}

// POST /programs/:slug/comments — auth + active account.
// Body: { body, parentId? }
export function createCommentFor(kind) {
  return async (req, res) => {
  if (!req.user.username) {
    return res.status(403).json({ error: "Choose a username before commenting.", code: "USERNAME_REQUIRED" });
  }

  const target = await findTarget(kind, req.params.slug);
  if (!target) return res.status(404).json({ error: NOT_FOUND[kind] });

  const { error, value: body } = parseCommentBody(req.body?.body);
  if (error) return res.status(400).json({ error });

  const parentId = req.body?.parentId || null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { programId: true, organizationId: true, hiddenAt: true },
    });
    // The DB can't enforce these: the parent must exist, be in the same
    // discussion, and not be hidden (no new replies under removed comments).
    const sameDiscussion =
      parent && (kind === "program" ? parent.programId === target.id : parent.organizationId === target.id);
    if (!sameDiscussion) {
      return res.status(400).json({ error: "You can only reply to a comment in this discussion" });
    }
    if (parent.hiddenAt) {
      return res.status(409).json({ error: "This comment was removed, so it can't take new replies" });
    }
  }

  const limited = await checkPostingLimit(prisma.comment, "authorId", req.user.userId, "comment");
  if (limited) return res.status(429).json({ error: limited });

  const comment = await prisma.comment.create({
    data: { ...target.where, authorId: req.user.userId, parentId, body },
    include: nodeInclude(0),
  });
  res.status(201).json(serialize(comment));
  };
}
export const createComment = createCommentFor("program");

// POST /comments/:id/reports — auth + active account. Body: { reason }
// Private to the admin. One report per user per comment.
export async function reportComment(req, res) {
  const { error, value: reason } = parseReportReason(req.body?.reason);
  if (error) return res.status(400).json({ error });

  const comment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    select: { authorId: true, hiddenAt: true, ...TARGET_SELECT },
  });
  if (!comment || !publicTargetOf(comment)) {
    return res.status(404).json({ error: "Comment not found" });
  }
  if (comment.authorId === req.user.userId) {
    return res.status(400).json({ error: "You can't report your own comment" });
  }
  if (comment.hiddenAt) {
    return res.status(409).json({ error: "This comment has already been removed" });
  }

  const limited = await checkPostingLimit(prisma.report, "reporterId", req.user.userId, "report");
  if (limited) return res.status(429).json({ error: limited });

  try {
    await prisma.report.create({ data: { commentId: req.params.id, reporterId: req.user.userId, reason } });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "You've already reported this comment" });
    throw err;
  }
  res.status(201).json({ ok: true });
}
