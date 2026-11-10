// Generates a one-time password-reset link for a user. Stand-in for the
// admin page's "Generate reset link" button (phase 5), which will call the
// same createResetToken(). The link is valid for 24 hours, works once, and
// voids any earlier unused link for that user.
//
//   node prisma/reset-link.js <email-or-username>
//
// Send the link ONLY through a channel you've confirmed belongs to the
// account owner (e.g. replying to a message from the account's email).
// The link is printed once and not stored; only its hash is in the DB.

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { createResetToken, resetLink, RESET_TOKEN_TTL_HOURS } from "../src/lib/passwordReset.js";

const who = process.argv[2]?.trim();
if (!who) {
  console.error("Usage: node prisma/reset-link.js <email-or-username>");
  process.exit(1);
}

const user = await prisma.user.findFirst({
  where: who.includes("@")
    ? { email: { equals: who, mode: "insensitive" } }
    : { usernameKey: who.toLowerCase() },
  select: { id: true, username: true },
});

if (!user) {
  console.error(`No user found for "${who}".`);
  await prisma.$disconnect();
  process.exit(1);
}

const raw = await createResetToken(user.id);
console.log(`Reset link for ${user.username ?? "(no username yet)"}, valid ${RESET_TOKEN_TTL_HOURS}h, single use:`);
console.log(resetLink(raw));
await prisma.$disconnect();
