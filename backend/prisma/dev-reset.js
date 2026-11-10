// Rebuilds the LOCAL development database from scratch:
//   1. drops everything and re-applies every migration (prisma migrate reset)
//   2. imports the SOURCE_VERIFIED programs from research/programs-staging.json
//   3. publishes them locally (so browse isn't empty) — production still
//      goes through the admin page's Approve & publish
//   4. creates two local accounts:
//        admin@example.com / local-admin-1  (ADMIN, username LocalAdmin)
//        user@example.com  / local-user-1   (USER,  username LocalUser)
//
//   npm run db:reset            # asks for confirmation
//   npm run db:reset -- --yes   # no prompt
//
// Refuses to run unless DATABASE_URL points at this machine (localhost /
// 127.0.0.1 / ::1) and NODE_ENV isn't "production", so it can't touch RDS.

import "dotenv/config";
import { execFileSync } from "node:child_process";
import readline from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(raw.replace(/^postgres(ql)?:/, "http:")).hostname;
  } catch {
    // fall through to the refusal below
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) || process.env.NODE_ENV === "production") {
    console.error(`Refusing to reset: DATABASE_URL host is "${host || "unparseable"}". This script only runs against a local database.`);
    process.exit(1);
  }
  return host;
}

const host = assertLocalDatabase();

if (!process.argv.includes("--yes")) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This ERASES all data in the local database on ${host}. Continue? (y/N) `);
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("Cancelled.");
    process.exit(0);
  }
}

const run = (cmd, args) => execFileSync(cmd, args, { cwd: backendDir, stdio: "inherit", env: process.env });

console.log("\n1/4 Resetting schema (all migrations)…");
run("npx", ["prisma", "migrate", "reset", "--force"]);
run("npx", ["prisma", "generate"]);

console.log("\n2/4 Importing SOURCE_VERIFIED programs…");
run("node", ["prisma/import-programs.js", "--apply"]);

// Import the client only after generate, so it matches the fresh schema.
const { prisma } = await import("../src/lib/prisma.js");

console.log("\n3/4 Creating local accounts…");
async function account(email, username, password, role) {
  return prisma.user.create({
    data: {
      email,
      username,
      usernameKey: username.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      branch: "MARINES",
      role,
    },
  });
}
const admin = await account("admin@example.com", "LocalAdmin", "local-admin-1", "ADMIN");
await account("user@example.com", "LocalUser", "local-user-1", "USER");

console.log("\n4/4 Publishing imported drafts (local only)…");
const drafts = await prisma.program.findMany({
  where: { publishStatus: "DRAFT", awaitingResearch: false },
  select: { id: true, contentHash: true },
});
const now = new Date();
for (const d of drafts) {
  await prisma.program.update({
    where: { id: d.id },
    data: { publishStatus: "PUBLISHED", reviewedById: admin.id, reviewedAt: now, reviewedContentHash: d.contentHash },
  });
}
await prisma.$disconnect();

console.log(`
Done. ${drafts.length} programs published locally.
  Admin: admin@example.com / local-admin-1
  User:  user@example.com  / local-user-1
Start the app: (cd backend && npm run dev) and (cd frontend && npm run dev), then open http://localhost:5173`);
