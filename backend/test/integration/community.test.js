// Comments (threading, depth, pagination, hidden placeholders, limits),
// reports and submissions.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, exec, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

const PUB = "vetswhocode-accelerator", ARCH = "hoh-corporate-fellowship", DRAFT = "amazon-technical-apprenticeship";

test("community", async (t) => {
  const check = checker(t);
  const A = await signup(call, "a"), B = await signup(call, "b"), C = await signup(call, "c"), D = await signup(call, "d");
  const post = (slug, body, tok) => call("POST", `/programs/${slug}/comments`, body, tok);

  // reads
  check("comments on published 200", (await call("GET", `/programs/${PUB}/comments`)).status === 200);
  check("comments on archived 200", (await call("GET", `/programs/${ARCH}/comments`)).status === 200);
  check("comments on draft 404", (await call("GET", `/programs/${DRAFT}/comments`)).status === 404);
  check("comments on missing 404", (await call("GET", "/programs/nope/comments")).status === 404);

  // posting rules
  check("post logged out 401", (await post(PUB, { body: "hi" })).status === 401);
  await exec(`update "User" set username=null, "usernameKey"=null where id='${D.id}'`);
  const noName = await post(PUB, { body: "hi" }, D.token);
  check("no username 403 + code", noName.status === 403 && noName.data.code === "USERNAME_REQUIRED", noName);
  check("empty body 400", (await post(PUB, { body: "   " }, A.token)).status === 400);
  check("2001 chars 400", (await post(PUB, { body: "x".repeat(2001) }, A.token)).status === 400);
  check("post on draft 404", (await post(DRAFT, { body: "hi" }, A.token)).status === 404);
  const top = await post(PUB, { body: "  <script>alert(1)</script>\nline two  " }, A.token);
  check("post ok 201", top.status === 201, top);
  check("body trimmed, stored as typed", top.data.body === "<script>alert(1)</script>\nline two");
  check("author is username only", JSON.stringify(top.data.author) === JSON.stringify({ username: A.username }));
  check("no ids/emails leaked", !/authorId|email|hiddenReason/.test(JSON.stringify(top.data)));
  const archC = await post(ARCH, { body: "archived still open" }, B.token);
  check("archived listing accepts comments", archC.status === 201);
  check("reply to other program's comment 400", (await post(PUB, { body: "x", parentId: archC.data.id }, A.token)).status === 400);
  check("reply to missing parent 400", (await post(PUB, { body: "x", parentId: "nope" }, A.token)).status === 400);
  const reply = await post(PUB, { body: "a reply", parentId: top.data.id }, B.token);
  check("reply ok", reply.status === 201 && reply.data.parentId === top.data.id);

  // suspension
  await exec(`update "User" set "suspendedAt"=now() where id='${C.id}'`);
  check("suspended post 403", (await post(PUB, { body: "hi" }, C.token)).status === 403);
  check("suspended report 403", (await call("POST", `/comments/${top.data.id}/reports`, { reason: "x" }, C.token)).status === 403);
  check("suspended submit 403", (await call("POST", "/submissions", { kind: "NEW_LISTING_LEAD", body: "x" }, C.token)).status === 403);
  await exec(`update "User" set "suspendedAt"=null where id='${C.id}'`);

  // depth: a chain of 5 replies
  let parent = (await post(PUB, { body: "depth 0" }, B.token)).data;
  const chain = [parent];
  for (let d = 1; d <= 4; d++) {
    parent = (await post(PUB, { body: `depth ${d}`, parentId: parent.id }, d % 2 ? A.token : B.token)).data;
    chain.push(parent);
  }
  const list = (await call("GET", `/programs/${PUB}/comments`)).data;
  const root = list.comments.find((c) => c.id === chain[0].id);
  const d3 = root?.replies[0]?.replies[0]?.replies[0];
  check("3 reply levels inline", d3?.id === chain[3].id);
  check("depth-3 node: count 1, none inline", d3?.replyCount === 1 && d3.replies.length === 0);
  const th = await call("GET", `/comments/${chain[3].id}/thread`);
  check("thread rooted at depth 3 shows its reply", th.status === 200 && th.data.root.replies[0]?.id === chain[4].id && th.data.root.parentId === chain[2].id);
  check("thread includes program link", th.data.program?.slug === PUB);
  check("thread missing 404", (await call("GET", "/comments/nope/thread")).status === 404);

  // posting limit: B has posted archC, reply, depth 0, depth 2, depth 4 = 5
  check("6th comment in 10 min 429", (await post(PUB, { body: "sixth" }, B.token)).status === 429);

  // hidden comment (Reddit-style)
  await exec(`update "Comment" set "hiddenAt"=now(), "hiddenReason"='test reason' where id='${top.data.id}'`);
  const hidden = (await call("GET", `/programs/${PUB}/comments`)).data.comments.find((c) => c.id === top.data.id);
  check("hidden: no body/author", hidden.hidden === true && hidden.body === null && hidden.author === null);
  check("hidden: replies stay visible", hidden.replies[0]?.id === reply.data.id);
  check("hidden: reason never public", !JSON.stringify(hidden).includes("test reason"));
  check("reply to hidden 409", (await post(PUB, { body: "x", parentId: top.data.id }, C.token)).status === 409);

  // reports
  const rep = (id, reason, tok) => call("POST", `/comments/${id}/reports`, { reason }, tok);
  check("report logged out 401", (await rep(reply.data.id, "x")).status === 401);
  check("report own 400", (await rep(reply.data.id, "x", B.token)).status === 400);
  check("report empty reason 400", (await rep(reply.data.id, " ", A.token)).status === 400);
  check("report ok 201", (await rep(reply.data.id, "rude", A.token)).status === 201);
  check("duplicate report 409", (await rep(reply.data.id, "again", A.token)).status === 409);
  check("report hidden 409", (await rep(top.data.id, "x", C.token)).status === 409);
  check("report missing 404", (await rep("nope", "x", A.token)).status === 404);
  check("report stored OPEN", (await one(`select status from "Report" where "commentId"='${reply.data.id}'`)) === "OPEN");

  // pagination: 22 top-level comments on the archived listing
  const progId = await one(`select id from "Program" where slug='${ARCH}'`);
  await exec(`insert into "Comment"(id,"programId","authorId",body,"createdAt") select 'pg_'||lpad(g::text,2,'0'), '${progId}', '${C.id}', 'page-'||g, timestamp '2026-01-01' + (g||' minutes')::interval from generate_series(1,22) g`);
  const p1 = (await call("GET", `/programs/${ARCH}/comments`)).data;
  check("page 1 has 20 + cursor", p1.comments.length === 20 && Boolean(p1.nextCursor));
  check("oldest first", p1.comments[0].body === "page-1" && p1.comments[19].body === "page-20");
  const p2 = (await call("GET", `/programs/${ARCH}/comments?cursor=${encodeURIComponent(p1.nextCursor)}`)).data;
  const rest = p2.comments.map((c) => c.body);
  check("page 2 continues, no overlap", rest[0] === "page-21" && rest[1] === "page-22" && rest.includes("archived still open") && !p2.nextCursor, rest);
  check("total counts all comments", p1.total === Number(await one(`select count(*) from "Comment" where "programId"='${progId}'`)));
  check("garbage cursor = first page", (await call("GET", `/programs/${ARCH}/comments?cursor=zzz`)).data.comments[0].body === "page-1");

  // submissions
  const S = (body, tok) => call("POST", "/submissions", body, tok);
  check("submit logged out 401", (await S({ kind: "NEW_LISTING_LEAD", body: "x" })).status === 401);
  check("bad kind 400", (await S({ kind: "OTHER", body: "x" }, C.token)).status === 400);
  check("lead with program 400", (await S({ kind: "NEW_LISTING_LEAD", programSlug: PUB, body: "x" }, C.token)).status === 400);
  check("update without program 400", (await S({ kind: "LISTING_UPDATE", body: "x" }, C.token)).status === 400);
  check("update on draft 400", (await S({ kind: "LISTING_UPDATE", programSlug: DRAFT, body: "x" }, C.token)).status === 400);
  check("javascript: url 400", (await S({ kind: "NEW_LISTING_LEAD", body: "x", sourceUrl: "javascript:alert(1)" }, C.token)).status === 400);
  check("empty body 400", (await S({ kind: "NEW_LISTING_LEAD", body: "" }, C.token)).status === 400);
  check("lead ok 201", (await S({ kind: "NEW_LISTING_LEAD", body: "Try X", sourceUrl: "https://example.org/x" }, C.token)).status === 201);
  check("update ok (no username needed)", (await S({ kind: "LISTING_UPDATE", programSlug: PUB, body: "Dates changed" }, D.token)).status === 201);
  check("update on archived ok", (await S({ kind: "LISTING_UPDATE", programSlug: ARCH, body: "Reopened?" }, C.token)).status === 201);
  const mine = (await call("GET", "/submissions/mine", null, C.token)).data;
  check("mine: own 2, newest first", mine.length === 2 && mine[0].kind === "LISTING_UPDATE" && mine[1].sourceUrl === "https://example.org/x");
  check("mine: no submitter fields", !/submitterId|email/.test(JSON.stringify(mine)));
  check("others see only their own", (await call("GET", "/submissions/mine", null, D.token)).data.length === 1);
  check("submission never touched listing", (await one(`select "publishStatus" from "Program" where slug='${PUB}'`)) === "PUBLISHED");
  for (let i = 0; i < 8; i++) await S({ kind: "NEW_LISTING_LEAD", body: `lead ${i}` }, C.token);
  check("11th submission in a day 429", (await S({ kind: "NEW_LISTING_LEAD", body: "one more" }, C.token)).status === 429);
  check.done(assert);
});
