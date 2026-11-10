// General discussion on organization pages: same rules as listing comments.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, exec, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

test("organization discussion", async (t) => {
  const check = checker(t);
  const A = await signup(call, "oa"), B = await signup(call, "ob");
  const post = (slug, body, tok) => call("POST", `/organizations/${slug}/comments`, body, tok);

  // visibility follows the org page rule (needs a public program)
  check("org with published program 200", (await call("GET", "/organizations/vetswhocode/comments")).status === 200);
  check("archived-only org 200", (await call("GET", "/organizations/hoh/comments")).status === 200);
  check("drafts-only org 404", (await call("GET", "/organizations/amazon/comments")).status === 404);
  check("missing org 404", (await call("GET", "/organizations/nope/comments")).status === 404);
  check("post on drafts-only org 404", (await post("amazon", { body: "hi" }, A.token)).status === 404);
  check("post logged out 401", (await post("vetswhocode", { body: "hi" })).status === 401);

  const top = await post("vetswhocode", { body: "How is the Vets Who Code community overall?" }, A.token);
  check("post ok 201", top.status === 201 && top.data.author.username === A.username, top);
  check("stored with organizationId, no programId", (await one(`select ("organizationId" is not null and "programId" is null)::text from "Comment" where id='${top.data.id}'`)) === "true");
  const reply = await post("vetswhocode", { body: "Great mentors.", parentId: top.data.id }, B.token);
  check("reply ok", reply.status === 201 && reply.data.parentId === top.data.id);

  // org and listing discussions stay separate
  const listingC = (await call("POST", "/programs/vetswhocode-accelerator/comments", { body: "listing comment" }, B.token)).data;
  check("reply across discussions 400 (org → listing parent)", (await post("vetswhocode", { body: "x", parentId: listingC.id }, A.token)).status === 400);
  check("reply across discussions 400 (listing → org parent)", (await call("POST", "/programs/vetswhocode-accelerator/comments", { body: "x", parentId: top.data.id }, A.token)).status === 400);
  check("reply to another org's comment 400", (await post("hoh", { body: "x", parentId: top.data.id }, A.token)).status === 400);
  const orgList = (await call("GET", "/organizations/vetswhocode/comments")).data;
  check("org list has its thread only", orgList.total === 2 && orgList.comments.length === 1 && orgList.comments[0].replies[0]?.id === reply.data.id);
  check("listing list excludes org comments", !(await call("GET", "/programs/vetswhocode-accelerator/comments")).data.comments.some((c) => c.id === top.data.id));

  // thread view + report work for org comments
  const th = (await call("GET", `/comments/${top.data.id}/thread`)).data;
  check("thread target is the organization", th.target?.kind === "organization" && th.target.slug === "vetswhocode" && !th.program);
  check("report org comment 201", (await call("POST", `/comments/${top.data.id}/reports`, { reason: "test" }, B.token)).status === 201);

  // hidden placeholder, suspension and username rules apply too
  await exec(`update "Comment" set "hiddenAt"=now() where id='${top.data.id}'`);
  const hidden = (await call("GET", "/organizations/vetswhocode/comments")).data.comments[0];
  check("hidden placeholder", hidden.hidden && hidden.body === null && hidden.replies.length === 1);
  check("reply to hidden 409", (await post("vetswhocode", { body: "x", parentId: top.data.id }, B.token)).status === 409);
  await exec(`update "User" set "suspendedAt"=now() where id='${B.id}'`);
  check("suspended 403", (await post("vetswhocode", { body: "x" }, B.token)).status === 403);
  await exec(`update "User" set username=null, "usernameKey"=null where id='${A.id}'`);
  check("no username 403", (await post("vetswhocode", { body: "x" }, A.token)).data?.code === "USERNAME_REQUIRED");
  check.done(assert);
});
