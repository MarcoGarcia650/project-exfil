// Shared harness for the HTTP integration suites.
//
// Points the app at a SEPARATE test database (never your dev data):
//   TEST_DATABASE_URL, or DATABASE_URL from backend/.env with the database
//   name swapped to "exfil_test". Refuses any database whose name doesn't
//   end in "_test", and any non-local host unless running in CI.
//
// Each suite file calls setup(): migrations → wipe test tables → fixtures →
// start the API on a random port. node --test runs each file in its own
// process; run them one at a time (--test-concurrency=1) since they share
// the test database.

import "dotenv/config";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const u = new URL(process.env.DATABASE_URL);
  u.pathname = "/exfil_test";
  return u.toString();
}

const url = testDatabaseUrl();
const parsed = new URL(url.replace(/^postgres(ql)?:/, "http:"));
const dbName = parsed.pathname.replace(/^\//, "");
if (!dbName.endsWith("_test")) throw new Error(`Refusing: test database "${dbName}" must end in _test`);
if (!process.env.CI && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
  throw new Error(`Refusing: test database host "${parsed.hostname}" isn't local`);
}

// Must be set before the app (and its Prisma client) is imported.
process.env.DATABASE_URL = url;
process.env.JWT_SECRET ||= "integration-test-secret";
process.env.FRONTEND_URL ||= "http://localhost:5173";
delete process.env.TRUST_PROXY;

const childEnv = { ...process.env, DATABASE_URL: url };

let prismaRef;
let server;

export async function setup() {
  execFileSync("npx", ["prisma", "migrate", "deploy"], { cwd: backendDir, env: childEnv, stdio: "ignore" });
  const { prisma } = await import("../../src/lib/prisma.js");
  prismaRef = prisma;
  await resetData();
  const { default: app } = await import("../../src/app.js");
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, prisma };
}

export async function teardown() {
  await new Promise((resolve) => server?.close(resolve));
  await prismaRef?.$disconnect();
}

// Empties every app table in the TEST database (the name was checked above)
// and loads the fixtures.
export async function resetData() {
  const tables = await prismaRef.$queryRawUnsafe(
    `select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'`
  );
  if (tables.length) {
    await prismaRef.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
  const { loadFixtures } = await import("./fixtures.js");
  await loadFixtures(prismaRef);
}

export const sql = (q) => prismaRef.$queryRawUnsafe(q);
export const exec = (q) => prismaRef.$executeRawUnsafe(q);

// Runs a backend script (make-admin, reset-link, …) against the test DB.
export function script(...args) {
  return spawnSync("node", args, { cwd: backendDir, env: childEnv, encoding: "utf8" });
}

export function client(base) {
  return async function call(method, p, body, token) {
    const res = await fetch(base + p, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      ...(body && { body: JSON.stringify(body) }),
    });
    return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
  };
}

// Collects named checks and fails the test once, listing every failure.
export function checker(t) {
  const failures = [];
  let count = 0;
  const check = (name, ok, extra = "") => {
    count += 1;
    if (!ok) failures.push(`${name}${extra !== "" ? ` (${typeof extra === "string" ? extra : JSON.stringify(extra)})` : ""}`);
  };
  check.done = (assert) => {
    t.diagnostic(`${count - failures.length}/${count} checks passed`);
    assert.deepEqual(failures, [], `Failed checks:\n  - ${failures.join("\n  - ")}`);
  };
  return check;
}

let seq = 0;
export const unique = () => `${Date.now() % 1_000_000}${seq++}`;

// First column of the first row, as a string (or undefined).
export async function one(q) {
  const rows = await sql(q);
  const row = rows[0];
  return row ? String(Object.values(row)[0]) : undefined;
}

export async function signup(call, tag, extra = {}) {
  const n = unique();
  const username = `T${tag}_${n}`.slice(0, 20);
  const email = `it-${tag}-${n}@example.com`.toLowerCase();
  const r = await call("POST", "/auth/signup", { email, password: "longenough", username, branch: "NAVY", ...extra });
  if (r.status !== 201) throw new Error(`signup ${tag} failed: ${JSON.stringify(r)}`);
  const id = await one(`select id from "User" where email='${email}'`);
  return { token: r.data.token, username, email, id };
}
