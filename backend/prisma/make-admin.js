// Grants (or revokes) the ADMIN role. There is deliberately no UI or API
// for this: admin rights only come from someone with database access.
//
//   node prisma/make-admin.js <email-or-username>            # grant
//   node prisma/make-admin.js <email-or-username> --revoke   # back to USER
//
// Takes effect on the user's next request (requireAuth reads role from the DB).

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const who = process.argv[2]?.trim();
const revoke = process.argv.includes("--revoke");
if (!who || who.startsWith("--")) {
  console.error("Usage: node prisma/make-admin.js <email-or-username> [--revoke]");
  process.exit(1);
}

const user = await prisma.user.findFirst({
  where: who.includes("@") ? { email: { equals: who, mode: "insensitive" } } : { usernameKey: who.toLowerCase() },
  select: { id: true, username: true, role: true, suspendedAt: true },
});
if (!user) {
  console.error(`No user found for "${who}".`);
  await prisma.$disconnect();
  process.exit(1);
}

const role = revoke ? "USER" : "ADMIN";
if (user.role === role) {
  console.log(`${user.username ?? "(no username)"} is already ${role}. Nothing changed.`);
} else {
  // An admin must not be read-only, so granting also lifts any suspension.
  await prisma.user.update({ where: { id: user.id }, data: { role, ...(!revoke && { suspendedAt: null }) } });
  console.log(`${user.username ?? "(no username)"}: ${user.role} → ${role}`);
}
await prisma.$disconnect();
