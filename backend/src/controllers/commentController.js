import { prisma } from "../lib/prisma.js";
import { isPublicStatus } from "../lib/publishStatus.js";
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
async function findPublicProgram(slug) {
  const program = await prisma.program.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, publishStatus: true },
  });
  return program && isPublicStatus(program.publishStatus) ? program : null;
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

// GET /programs/:slug/comments?cursor=… — public.
// Top-level comments oldest-first, each with up to THREAD_DEPTH levels of replies.
export async function listProgramComments(req, res) {
  const program = await findPublicProgram(req.params.slug);
  if (!program) return res.status(404).json({ error: "Program not found" });

  const total = await prisma.comment.count({ where: { programId: program.id } });
  const { items, nextCursor } = await page(
    { programId: program.id, parentId: null },
    req.query.cursor,
    nodeInclude(THREAD_DEPTH)
  );
  res.json({ comments: items, nextCursor, total });
}

// GET /comments/:id/thread?cursor=… — public.
// A view rooted at one comment ("continue thread" / "more replies"): the
// root, then its direct replies paged, each with THREAD_DEPTH - 1 more levels.
export async function getThread(req, res) {
  const root = await prisma.comment.findUnique({
    where: { id: req.params.id },
    include: { ...nodeInclude(0), program: { select: { slug: true, name: true, publishStatus: true } } },
  });
  if (!root || !isPublicStatus(root.program.publishStatus)) {
    return res.status(404).json({ error: "Comment not found" });
  }

  const { items, nextCursor } = await page({ parentId: root.id }, req.query.cursor, nodeInclude(THREAD_DEPTH - 1));
  res.json({
    program: { slug: root.program.slug, name: root.program.name },
    root: { ...serialize(root), replies: items },
    nextCursor,
  });
}

// POST /programs/:slug/comments — auth + active account.
// Body: { body, parentId? }
export async function createComment(req, res) {
  if (!req.user.username) {
    return res.status(403).json({ error: "Choose a username before commenting.", code: "USERNAME_REQUIRED" });
  }

  const program = await findPublicProgram(req.params.slug);
  if (!program) return res.status(404).json({ error: "Program not found" });

  const { error, value: body } = parseCommentBody(req.body?.body);
  if (error) return res.status(400).json({ error });

  const parentId = req.body?.parentId || null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { programId: true, hiddenAt: true },
    });
    // The DB can't enforce these: the parent must exist, be on the same
    // program, and not be hidden (no new replies under removed comments).
    if (!parent || parent.programId !== program.id) {
      return res.status(400).json({ error: "You can only reply to a comment on this listing" });
    }
    if (parent.hiddenAt) {
      return res.status(409).json({ error: "This comment was removed, so it can't take new replies" });
    }
  }

  const limited = await checkPostingLimit(prisma.comment, "authorId", req.user.userId, "comment");
  if (limited) return res.status(429).json({ error: limited });

  const comment = await prisma.comment.create({
    data: { programId: program.id, authorId: req.user.userId, parentId, body },
    include: nodeInclude(0),
  });
  res.status(201).json(serialize(comment));
}

// POST /comments/:id/reports — auth + active account. Body: { reason }
// Private to the admin. One report per user per comment.
export async function reportComment(req, res) {
  const { error, value: reason } = parseReportReason(req.body?.reason);
  if (error) return res.status(400).json({ error });

  const comment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    select: { authorId: true, hiddenAt: true, program: { select: { publishStatus: true } } },
  });
  if (!comment || !isPublicStatus(comment.program.publishStatus)) {
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
