// Contact admin: send, limits, own-only list, admin inbox + reply.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, exec, script, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

test("contact admin", async (t) => {
  const check = checker(t);
  const U = await signup(call, "cu"), V = await signup(call, "cv"), Adm = await signup(call, "cadm");
  script("prisma/make-admin.js", Adm.username);
  const send = (body, tok) => call("POST", "/contact", body, tok);

  check("logged out 401", (await send({ subject: "Hi", body: "x" })).status === 401);
  check("empty subject 400", (await send({ subject: " ", body: "x" }, U.token)).status === 400);
  check("empty body 400", (await send({ subject: "Hi", body: "" }, U.token)).status === 400);
  check("subject too long 400", (await send({ subject: "x".repeat(121), body: "x" }, U.token)).status === 400);
  check("body too long 400", (await send({ subject: "Hi", body: "x".repeat(3001) }, U.token)).status === 400);
  const sent = await send({ subject: "  Question about MSSA  ", body: "When does the next cohort open?" }, U.token);
  check("send 201", sent.status === 201 && sent.data.status === "OPEN");
  check("subject trimmed", (await one(`select subject from "ContactMessage" where id='${sent.data.id}'`)) === "Question about MSSA");

  await exec(`update "User" set "suspendedAt"=now() where id='${U.id}'`);
  check("suspended user can still send", (await send({ subject: "Appeal", body: "Why was I suspended?" }, U.token)).status === 201);
  await exec(`update "User" set "suspendedAt"=null where id='${U.id}'`);

  const mine = (await call("GET", "/contact/mine", null, U.token)).data;
  check("mine: own 2, newest first", mine.length === 2 && mine[0].subject === "Appeal");
  check("mine: no user fields", !/userId|email/.test(JSON.stringify(mine)));
  check("others see only their own", (await call("GET", "/contact/mine", null, V.token)).data.length === 0);

  // admin inbox
  check("non-admin inbox 403", (await call("GET", "/admin/messages", null, U.token)).status === 403);
  const inbox = (await call("GET", "/admin/messages", null, Adm.token)).data;
  check("inbox lists open, oldest first, with sender email", inbox.length === 2 && inbox[0].id === sent.data.id && inbox[0].user.email === U.email);
  check("summary counts open messages", (await call("GET", "/admin/summary", null, Adm.token)).data.openMessages === 2);
  const reply = (id, body, tok = Adm.token) => call("POST", `/admin/messages/${id}/reply`, body, tok);
  check("empty reply 400", (await reply(sent.data.id, { reply: " " })).status === 400);
  check("non-admin reply 403", (await reply(sent.data.id, { reply: "x" }, U.token)).status === 403);
  check("reply ok", (await reply(sent.data.id, { reply: "Next cohort opens in March." })).status === 200);
  check("reply again 409", (await reply(sent.data.id, { reply: "again" })).status === 409);
  check("reply missing 404", (await reply("nope", { reply: "x" })).status === 404);
  const answered = (await call("GET", "/contact/mine", null, U.token)).data.find((m) => m.id === sent.data.id);
  check("sender sees reply + RESOLVED", answered.status === "RESOLVED" && answered.adminReply === "Next cohort opens in March." && answered.repliedAt);
  check("resolved list shows it", (await call("GET", "/admin/messages?status=RESOLVED", null, Adm.token)).data.some((m) => m.id === sent.data.id));
  check("open list no longer has it", !(await call("GET", "/admin/messages", null, Adm.token)).data.some((m) => m.id === sent.data.id));

  // daily limit: U has sent 2
  for (let i = 0; i < 3; i++) await send({ subject: `m${i}`, body: "x" }, U.token);
  check("6th message in a day 429", (await send({ subject: "one more", body: "x" }, U.token)).status === 429);
  check.done(assert);
});
