// Accounts: signup validation, usernames, sessions/tokenVersion,
// suspension, password reset links, login rate limits.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { setup, teardown, client, checker, one, exec, script, unique } from "./harness.js";
import { LEGACY_USER } from "./fixtures.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

const S = (body) => call("POST", "/auth/signup", body);

test("accounts", async (t) => {
  const check = checker(t);
  const n = unique();
  const E = `Smoke3-${n}@Example.com`, UN = `Smoke3_${n}`.slice(0, 20);

  check("missing branch 400", (await S({ email: `x${n}@e.com`, password: "longenough", username: `Ok_${n}`.slice(0, 20) })).status === 400);
  check("bad username 400", (await S({ email: `x${n}@e.com`, password: "longenough", username: "1bad", branch: "ARMY" })).status === 400);
  check("reserved username 400", (await S({ email: `x${n}@e.com`, password: "longenough", username: "Admin", branch: "ARMY" })).status === 400);
  check("short password 400", (await S({ email: `x${n}@e.com`, password: "short", username: "Ok_x", branch: "ARMY" })).status === 400);
  check("bad email 400", (await S({ email: "nope", password: "longenough", username: "Ok_x", branch: "ARMY" })).status === 400);
  check("signup ok 201", (await S({ email: E, password: "longenough", username: UN, branch: "MARINES" })).status === 201);
  check("email stored lowercase", (await one(`select email from "User" where "usernameKey"=lower('${UN}')`)) === E.toLowerCase());
  check("dup email (other case) 409", (await S({ email: E.toUpperCase(), password: "longenough", username: `Other_${n}`.slice(0, 20), branch: "ARMY" })).status === 409);
  check("dup username (other case) 409", (await S({ email: `y${n}@e.com`, password: "longenough", username: UN.toLowerCase(), branch: "ARMY" })).status === 409);

  const T = (await call("POST", "/auth/login", { email: E.toUpperCase(), password: "longenough" })).data?.token;
  check("login is case-insensitive", typeof T === "string" && T.length > 20);
  check("login missing fields 400", (await call("POST", "/auth/login", {})).status === 400);
  const me = await call("GET", "/auth/me", null, T);
  check("/auth/me username", me.data.username === UN);
  check("/auth/me no hash", !/hash/i.test(JSON.stringify(me.data)));
  check("set username when already set 409", (await call("POST", "/auth/username", { username: "Another_1" }, T)).status === 409);

  // legacy account without a username
  const T2 = (await call("POST", "/auth/login", LEGACY_USER)).data?.token;
  check("legacy user has null username", (await call("GET", "/auth/me", null, T2)).data.username === null);
  check("legacy pick taken 409", (await call("POST", "/auth/username", { username: UN.toUpperCase() }, T2)).status === 409);
  check("legacy pick invalid 400", (await call("POST", "/auth/username", { username: "no" }, T2)).status === 400);
  check("legacy pick ok 200", (await call("POST", "/auth/username", { username: `Legacy_${n}`.slice(0, 20) }, T2)).status === 200);

  // tokens issued before tokenVersion existed (no `tv` claim) still work
  const userId = await one(`select id from "User" where "usernameKey"=lower('${UN}')`);
  const OLD = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
  check("pre-tokenVersion JWT works", (await call("GET", "/dashboard", null, OLD)).status === 200);

  // suspension = read-only
  await exec(`update "User" set "suspendedAt"=now() where id='${userId}'`);
  const pid = (await call("GET", "/programs")).data[0].id;
  check("suspended: save 403", (await call("POST", "/saved-employers", { programId: pid }, T)).status === 403);
  check("suspended: dashboard 200", (await call("GET", "/dashboard", null, T)).status === 200);
  check("suspended: me.suspended", (await call("GET", "/auth/me", null, T)).data.suspended === true);
  await exec(`update "User" set "suspendedAt"=null where id='${userId}'`);
  check("unsuspended: save 201", (await call("POST", "/saved-employers", { programId: pid }, T)).status === 201);

  // password reset links
  const tokenFrom = (out) => decodeURIComponent(out.trim().split("\n").pop().split("token=")[1]);
  const R1 = tokenFrom(script("prisma/reset-link.js", UN).stdout);
  const out2 = script("prisma/reset-link.js", E.toUpperCase()).stdout;
  const R2 = tokenFrom(out2);
  check("reset link format", /\/reset-password\?token=/.test(out2));
  check("only hash stored", (await one(`select count(*) from "PasswordResetToken" where "tokenHash"='${R2}'`)) === "0");
  const RP = (token, password) => call("POST", "/auth/reset-password", { token, password });
  check("earlier link voided by new one", (await RP(R1, "newpassword1")).status === 400);
  check("reset short password 400", (await RP(R2, "short")).status === 400);
  check("reset bogus token 400", (await RP("bogus", "newpassword1")).status === 400);
  check("reset ok 200", (await RP(R2, "newpassword1")).status === 200);
  check("old session ends 401", (await call("GET", "/dashboard", null, T)).status === 401);
  check("reused link 400", (await RP(R2, "newpassword2")).status === 400);
  check("old password rejected", (await call("POST", "/auth/login", { email: E, password: "longenough" })).status === 401);
  const T3 = (await call("POST", "/auth/login", { email: E, password: "newpassword1" })).data?.token;
  check("new password works", (await call("GET", "/dashboard", null, T3)).status === 200);
  const R3 = tokenFrom(script("prisma/reset-link.js", UN).stdout);
  await exec(`update "PasswordResetToken" set "expiresAt"=now()-interval '1 minute' where "userId"='${userId}' and "usedAt" is null`);
  check("expired link 400", (await RP(R3, "newpassword3")).status === 400);
  check("reset-link unknown user exits 1", script("prisma/reset-link.js", "nobody_here").status === 1);

  // rate limits (last: they use up this process's in-memory budget)
  const codes = [];
  for (let i = 0; i < 11; i++) codes.push((await call("POST", "/auth/login", { email: `target${n}@e.com`, password: "wrongpass" })).status);
  check("11th failed login for one email 429", codes.at(-1) === 429, codes);
  check("first 10 were 401", codes.filter((c) => c === 401).length === 10, codes);
  check("other account unaffected", (await call("POST", "/auth/login", { email: E, password: "newpassword1" })).status === 200);
  const limited = await call("POST", "/auth/login", { email: `target${n}@e.com`, password: "x" });
  check("429 says why", limited.data?.error?.startsWith("Too many"));
  check.done(assert);
});
