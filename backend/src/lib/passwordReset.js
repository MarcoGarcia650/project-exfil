import crypto from "node:crypto";
import { prisma } from "./prisma.js";

export const RESET_TOKEN_TTL_HOURS = 24;

// Only the SHA-256 of a token is stored; the raw token exists only in the
// link. A DB leak therefore can't be turned into working reset links.
export const hashResetToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// Creates a single-use reset token for a user and returns the raw token.
// Delivery is the caller's job (today: an admin copies the link; later:
// SES email), so this function never changes when email is added.
// Issuing a new token voids the user's earlier unused ones.
export async function createResetToken(userId, { createdById = null } = {}) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        createdById,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_HOURS * 3600 * 1000),
      },
    }),
  ]);
  return raw;
}

export function resetLink(raw) {
  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(raw)}`;
}
