import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const API = "http://localhost:4100";
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backend");

let seq = 0;
export const unique = () => `${Date.now() % 1_000_000}${seq++}`;

export async function api(method, p, body, token) {
  const res = await fetch(API + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body && { body: JSON.stringify(body) }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

export async function signupApi(tag) {
  const n = unique();
  const username = `E${tag}_${n}`.slice(0, 20);
  const email = `e2e-${tag}-${n}@example.com`.toLowerCase();
  const r = await api("POST", "/auth/signup", { email, password: "longenough", username, branch: "ARMY" });
  if (r.status !== 201) throw new Error(`signup failed: ${JSON.stringify(r)}`);
  return { email, username, password: "longenough", token: r.data.token };
}

// Runs a backend script (make-admin, reset-link) against the TEST database.
// The test-db helper sets DATABASE_URL the same way the API server does.
export function backendScript(...args) {
  return execFileSync("node", ["test/integration/run-script.js", ...args], { cwd: backendDir, encoding: "utf8" });
}

export async function login(page, { email, password }) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/programs$/);
}

// Fails the test on unexpected console errors (expected API 4xx are ignored).
export function watchConsole(page, allowed = /status of (400|401|403|404|409|429)/) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !allowed.test(m.text()) && errors.push(m.text()));
  return errors;
}
