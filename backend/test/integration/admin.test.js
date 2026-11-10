// Admin page API: access control, make-admin, reports, submissions,
// users (suspend, reset links), drafts (Approve & publish).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, script, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

const PUB = "vetswhocode-accelerator";

test("admin", async (t) => {
  const check = checker(t);
  const Adm = await signup(call, "adm"), X = await signup(call, "x"), Y = await signup(call, "y");

  // access
  check("logged out 401", (await call("GET", "/admin/summary")).status === 401);
  check("non-admin 403", (await call("GET", "/admin/summary", null, X.token)).status === 403);
  check("make-admin unknown user exits 1", script("prisma/make-admin.js", "nobody_zz").status === 1);
  check("make-admin grants", script("prisma/make-admin.js", Adm.username).stdout.includes("USER → ADMIN"));
  check("make-admin idempotent", script("prisma/make-admin.js", Adm.email.toUpperCase()).stdout.includes("already ADMIN"));
  check("role effective on same token", (await call("GET", "/admin/summary", null, Adm.token)).status === 200);
  check("/auth/me shows ADMIN", (await call("GET", "/auth/me", null, Adm.token)).data.role === "ADMIN");

  // reports
  const post = (body, tok) => call("POST", `/programs/${PUB}/comments`, { body }, tok);
  const c1 = (await post("bad comment", X.token)).data, c2 = (await post("fine comment", X.token)).data;
  await call("POST", `/comments/${c1.id}/reports`, { reason: "rude" }, Y.token);
  await call("POST", `/comments/${c1.id}/reports`, { reason: "spam" }, Adm.token);
  await call("POST", `/comments/${c2.id}/reports`, { reason: "meh" }, Y.token);
  const g1 = (await call("GET", "/admin/reports", null, Adm.token)).data.find((c) => c.id === c1.id);
  check("reports grouped per comment", g1?.reports.length === 2 && g1.body === "bad comment");
  check("report shows author account", g1?.author.username === X.username && g1.author.id === X.id);
  check("hide needs reason 400", (await call("POST", `/admin/comments/${c1.id}/hide`, { reason: " " }, Adm.token)).status === 400);
  const hid = await call("POST", `/admin/comments/${c1.id}/hide`, { reason: "slur" }, Adm.token);
  check("hide ok, 2 reports actioned", hid.status === 200 && hid.data.resolved === 2, hid);
  const pv = (await call("GET", `/programs/${PUB}/comments`)).data.comments.find((c) => c.id === c1.id);
  check("hidden publicly as placeholder", pv.hidden && pv.body === null);
  check("hide again 409", (await call("POST", `/admin/comments/${c1.id}/hide`, { reason: "x" }, Adm.token)).status === 409);
  check("hide missing 404", (await call("POST", "/admin/comments/nope/hide", { reason: "x" }, Adm.token)).status === 404);
  check("dismiss ok", (await call("POST", `/admin/comments/${c2.id}/dismiss`, {}, Adm.token)).status === 200);
  check("dismissed stays visible", !(await call("GET", `/programs/${PUB}/comments`)).data.comments.find((c) => c.id === c2.id).hidden);
  check("dismiss with none open 404", (await call("POST", `/admin/comments/${c2.id}/dismiss`, {}, Adm.token)).status === 404);
  check("report statuses stored", (await one(`select string_agg(status::text, ',' order by status) from "Report" where "commentId" in ('${c1.id}','${c2.id}')`)) === "ACTIONED,ACTIONED,DISMISSED");
  check("non-admin can't hide 403", (await call("POST", `/admin/comments/${c2.id}/hide`, { reason: "x" }, Y.token)).status === 403);

  // submissions
  const sub = (await call("POST", "/submissions", { kind: "LISTING_UPDATE", programSlug: PUB, body: "update" }, X.token)).data;
  check("pending list has it with email", (await call("GET", "/admin/submissions", null, Adm.token)).data.some((s) => s.id === sub.id && s.submitter.email === X.email));
  check("bad decision 400", (await call("POST", `/admin/submissions/${sub.id}/review`, { decision: "MAYBE" }, Adm.token)).status === 400);
  check("accept with note", (await call("POST", `/admin/submissions/${sub.id}/review`, { decision: "ACCEPTED", note: "Fixed in next import" }, Adm.token)).status === 200);
  check("review again 409", (await call("POST", `/admin/submissions/${sub.id}/review`, { decision: "REJECTED" }, Adm.token)).status === 409);
  const mine = (await call("GET", "/submissions/mine", null, X.token)).data.find((s) => s.id === sub.id);
  check("submitter sees status + note", mine.status === "ACCEPTED" && mine.adminNote === "Fixed in next import");
  check("accepted list shows it", (await call("GET", "/admin/submissions?status=ACCEPTED", null, Adm.token)).data.some((s) => s.id === sub.id));

  // users
  check("search too short 400", (await call("GET", "/admin/users?q=a", null, Adm.token)).status === 400);
  const found = (await call("GET", `/admin/users?q=${encodeURIComponent(X.email)}`, null, Adm.token)).data;
  check("search by email", found.length === 1 && found[0].id === X.id && found[0]._count.comments === 2);
  check("search by username prefix, any case", (await call("GET", `/admin/users?q=${X.username.toUpperCase()}`, null, Adm.token)).data[0]?.id === X.id);
  check("no password hash in search", !/passwordHash|tokenVersion/.test(JSON.stringify(found)));
  const susp = await call("POST", `/admin/users/${X.id}/suspend`, {}, Adm.token);
  check("suspend ok", susp.status === 200 && susp.data.suspendedAt);
  check("suspended user can't post", (await post("x", X.token)).status === 403);
  check("can't suspend admin 400", (await call("POST", `/admin/users/${Adm.id}/suspend`, {}, Adm.token)).status === 400);
  check("unsuspend ok", (await call("POST", `/admin/users/${X.id}/unsuspend`, {}, Adm.token)).data.suspendedAt === null);
  check("suspend missing 404", (await call("POST", "/admin/users/nope/suspend", {}, Adm.token)).status === 404);
  const rl = (await call("POST", `/admin/users/${Y.id}/reset-link`, {}, Adm.token)).data;
  check("reset link issued", rl.link.includes("/reset-password?token=") && rl.expiresInHours === 24);
  check("issuer recorded", (await one(`select "createdById" from "PasswordResetToken" where "userId"='${Y.id}' order by "createdAt" desc limit 1`)) === Adm.id);
  check("admin-issued link works", (await call("POST", "/auth/reset-password", { token: decodeURIComponent(rl.link.split("token=")[1]), password: "resetbyadmin" })).status === 200);

  // drafts
  const drafts = (await call("GET", "/admin/drafts", null, Adm.token)).data;
  const oracle = drafts.find((d) => d.slug === "oracle-ovip"), mssa = drafts.find((d) => d.slug === "microsoft-mssa");
  check("drafts listed with hashes", drafts.length === 4 && mssa?.contentHash && !("reviewedById" in mssa));
  check("awaiting-research draft listed last", oracle?.awaitingResearch === true && drafts.at(-1).slug === "oracle-ovip");
  const pub = (id, contentHash, tok = Adm.token) => call("POST", `/admin/drafts/${id}/publish`, contentHash === undefined ? {} : { contentHash }, tok);
  check("publish awaiting-research 409", (await pub(oracle.id, oracle.contentHash)).status === 409);
  check("publish without hash 400", (await pub(mssa.id)).status === 400);
  check("stale hash 409", (await pub(mssa.id, "stale")).status === 409);
  check("non-admin publish 403", (await pub(mssa.id, mssa.contentHash, X.token)).status === 403);
  check("publish ok", (await pub(mssa.id, mssa.contentHash)).status === 200);
  check("now public", (await call("GET", "/programs/microsoft-mssa")).status === 200);
  check("review fields recorded", (await one(`select ("reviewedById"='${Adm.id}' and "reviewedContentHash"="contentHash" and "reviewedAt" is not null)::text from "Program" where slug='microsoft-mssa'`)) === "true");
  check("publish again 409", (await pub(mssa.id, mssa.contentHash)).status === 409);

  // revoke
  check("make-admin --revoke", script("prisma/make-admin.js", Adm.username, "--revoke").stdout.includes("ADMIN → USER"));
  check("revoked: 403 next request", (await call("GET", "/admin/summary", null, Adm.token)).status === 403);
  check.done(assert);
});
