import { prisma } from "../lib/prisma.js";
import { checkPostingLimit } from "../lib/postingLimit.js";
import { parseContactSubject, parseContactBody } from "../lib/communityRules.js";

// POST /contact — auth (suspended users allowed, so they can ask about it).
// Body: { subject, body }. 5 per user per day.
export async function sendMessage(req, res) {
  const subject = parseContactSubject(req.body?.subject);
  if (subject.error) return res.status(400).json({ error: subject.error });
  const body = parseContactBody(req.body?.body);
  if (body.error) return res.status(400).json({ error: body.error });

  const limited = await checkPostingLimit(prisma.contactMessage, "userId", req.user.userId, "contact");
  if (limited) return res.status(429).json({ error: limited });

  const message = await prisma.contactMessage.create({
    data: { userId: req.user.userId, subject: subject.value, body: body.value },
    select: { id: true, status: true, createdAt: true },
  });
  res.status(201).json(message);
}

// GET /contact/mine — auth. The user's own messages with any admin reply.
export async function listMyMessages(req, res) {
  const rows = await prisma.contactMessage.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, subject: true, body: true, status: true, adminReply: true, createdAt: true, repliedAt: true },
  });
  res.json(rows);
}
