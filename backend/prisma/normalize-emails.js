// Lowercases stored emails. Signup now stores lowercase and login matches
// case-insensitively, but rows created earlier may have capitals.
//
//   node prisma/normalize-emails.js          # dry run (default): report only
//   node prisma/normalize-emails.js --apply
//
// Refuses to change anything if two accounts differ only by case
// (e.g. Foo@x.com and foo@x.com): those need a human decision about which
// account to keep, so they're listed and the script exits non-zero.
// Idempotent: a second run finds nothing to change.

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const apply = process.argv.includes("--apply");
const users = await prisma.user.findMany({ select: { id: true, email: true } });

const byKey = new Map();
for (const u of users) {
  const key = u.email.trim().toLowerCase();
  byKey.set(key, [...(byKey.get(key) ?? []), u]);
}

const duplicates = [...byKey.values()].filter((group) => group.length > 1);
if (duplicates.length > 0) {
  console.error(`Found ${duplicates.length} email(s) shared by multiple accounts when case is ignored.`);
  console.error("Resolve these by hand first (user ids shown, not emails):");
  for (const group of duplicates) console.error("  ", group.map((u) => u.id).join(", "));
  await prisma.$disconnect();
  process.exit(2);
}

const toFix = users.filter((u) => u.email !== u.email.trim().toLowerCase());
console.log(`${users.length} users; ${toFix.length} email(s) need lowercasing.`);

if (apply && toFix.length > 0) {
  await prisma.$transaction(
    toFix.map((u) => prisma.user.update({ where: { id: u.id }, data: { email: u.email.trim().toLowerCase() } }))
  );
  console.log(`Updated ${toFix.length}.`);
} else if (!apply) {
  console.log("Dry run: nothing changed. Re-run with --apply to update.");
}
await prisma.$disconnect();
