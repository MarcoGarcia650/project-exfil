// Test-database-only data helpers for the browser suites (via run-script.js
// → harness, which refuses non-*_test databases):
//   node e2e-seed.js comments <programSlug> <count> <authorEmail>
//   node e2e-seed.js hide <commentId>
// Importing the harness applies its test-database checks and DATABASE_URL.
import "./harness.js";

const { prisma } = await import("../../src/lib/prisma.js");
const [cmd, ...args] = process.argv.slice(2);

if (cmd === "comments") {
  const [slug, count, email] = args;
  const program = await prisma.program.findUniqueOrThrow({ where: { slug } });
  const author = await prisma.user.findUniqueOrThrow({ where: { email } });
  const start = Date.UTC(2026, 0, 1);
  for (let i = 1; i <= Number(count); i++) {
    await prisma.comment.create({
      data: { programId: program.id, authorId: author.id, body: `seeded ${i}`, createdAt: new Date(start + i * 60_000) },
    });
  }
  console.log(`seeded ${count} comments on ${slug}`);
} else if (cmd === "hide") {
  await prisma.comment.update({ where: { id: args[0] }, data: { hiddenAt: new Date(), hiddenReason: "e2e" } });
  console.log(`hid ${args[0]}`);
} else {
  console.error("usage: e2e-seed.js comments <slug> <count> <email> | hide <commentId>");
  process.exitCode = 1;
}
await prisma.$disconnect();
