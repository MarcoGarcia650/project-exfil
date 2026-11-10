// Rejecting drafts: hidden everywhere, admin-only reason, restore.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, exec, script, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

test("reject drafts", async (t) => {
  const check = checker(t);
  const Adm = await signup(call, "adm"), X = await signup(call, "x");
  script("prisma/make-admin.js", Adm.username);
  const drafts = (await call("GET", "/admin/drafts", null, Adm.token)).data;
  const d = drafts.find((x) => x.slug === "fortinet-veterans"), oracle = drafts.find((x) => x.slug === "oracle-ovip");
  const rej = (id, body, tok = Adm.token) => call("POST", `/admin/drafts/${id}/reject`, body, tok);

  check("non-admin reject 403", (await rej(d.id, { reason: "x", contentHash: d.contentHash }, X.token)).status === 403);
  check("reject without reason 400", (await rej(d.id, { reason: " ", contentHash: d.contentHash })).status === 400);
  check("reject without hash 400", (await rej(d.id, { reason: "x" })).status === 400);
  check("reject stale hash 409", (await rej(d.id, { reason: "x", contentHash: "stale" })).status === 409);
  check("reject ok", (await rej(d.id, { reason: "Cost doesn't match page", contentHash: d.contentHash })).status === 200);
  check("reject again 409", (await rej(d.id, { reason: "x", contentHash: d.contentHash })).status === 409);
  check("publish rejected 409", (await call("POST", `/admin/drafts/${d.id}/publish`, { contentHash: d.contentHash }, Adm.token)).status === 409);
  check("gone from drafts", !(await call("GET", "/admin/drafts", null, Adm.token)).data.some((x) => x.id === d.id));
  check("listed in rejected with reason", (await call("GET", "/admin/rejected", null, Adm.token)).data.some((x) => x.id === d.id && x.rejectionReason === "Cost doesn't match page"));
  check("summary counts rejected", (await call("GET", "/admin/summary", null, Adm.token)).data.rejected === 1);

  // hidden on every public endpoint
  check("public page 404", (await call("GET", `/programs/${d.slug}`)).status === 404);
  check("not in browse", !(await call("GET", "/programs")).data.some((p) => p.id === d.id));
  check("comments 404", (await call("GET", `/programs/${d.slug}/comments`)).status === 404);
  check("can't comment 404", (await call("POST", `/programs/${d.slug}/comments`, { body: "x" }, X.token)).status === 404);
  check("can't save 404", (await call("POST", "/saved-employers", { programId: d.id }, X.token)).status === 404);
  check("can't submit update 400", (await call("POST", "/submissions", { kind: "LISTING_UPDATE", programSlug: d.slug, body: "x" }, X.token)).status === 400);
  check("org page hides it", (await call("GET", "/organizations/fortinet")).status === 404);
  check("reason never public", !JSON.stringify((await call("GET", "/programs")).data).includes("Cost doesn't match"));

  // awaiting-research drafts can be rejected, then restored
  check("reject awaiting-research draft", (await rej(oracle.id, { reason: "test", contentHash: oracle.contentHash })).status === 200);
  check("restore ok", (await call("POST", `/admin/rejected/${oracle.id}/restore`, {}, Adm.token)).status === 200);
  check("restored: DRAFT, flag kept, reason cleared", (await one(`select "publishStatus"||':'||"awaitingResearch"||':'||coalesce("rejectionReason",'null') from "Program" where id='${oracle.id}'`)) === "DRAFT:true:null");
  check("restore non-rejected 409", (await call("POST", `/admin/rejected/${oracle.id}/restore`, {}, Adm.token)).status === 409);

  // dashboard: a saved listing that ends up REJECTED shows no content
  const pub = (await call("GET", "/programs")).data[0];
  await call("POST", "/saved-employers", { programId: pub.id }, X.token);
  await exec(`update "Program" set "publishStatus"='REJECTED' where id='${pub.id}'`);
  const dash = (await call("GET", "/dashboard", null, X.token)).data.savedPrograms.find((s) => s.program.id === pub.id);
  check("dashboard: rejected saved = name/org only", dash?.program.publishStatus === "REJECTED" && !("officialSourceUrl" in dash.program) && !("format" in dash.program));
  check.done(assert);
});
