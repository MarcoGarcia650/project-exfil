// Public directory: browse, filters, listing pages, organizations, saving.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

test("public directory", async (t) => {
  const check = checker(t);
  const list = await call("GET", "/programs");
  check("browse lists PUBLISHED only", list.status === 200 && list.data.map((p) => p.slug).join() === "vetswhocode-accelerator", list.data);
  check("no review metadata in browse", !/contentHash|reviewed|awaitingResearch|rejection/.test(JSON.stringify(list.data)));
  check("filter match", (await call("GET", "/programs?techTrack=SOFTWARE_DEV&availability=ACCEPTING")).data.length === 1);
  check("filter no match", (await call("GET", "/programs?availability=CLOSED")).data.length === 0);
  check("unknown filter ignored", (await call("GET", "/programs?techTrack=BOGUS")).data.length === 1);

  // keyword search (name, organization, description; case-insensitive)
  const search = async (q) => (await call("GET", `/programs?q=${encodeURIComponent(q)}`)).data.map((p) => p.slug);
  check("search by program name", (await search("accelerator")).join() === "vetswhocode-accelerator");
  check("search by organization, any case", (await search("VETS WHO")).join() === "vetswhocode-accelerator");
  check("search by description", (await search("fixture description")).length === 1);
  check("search no match", (await search("zzz-nothing")).length === 0);
  check("search never returns drafts", (await search("microsoft")).length === 0);
  check("blank search = all", (await search("   ")).length === 1);
  check("search combines with filters", (await call("GET", "/programs?q=vets&availability=CLOSED")).data.length === 0);

  check("published page 200", (await call("GET", "/programs/vetswhocode-accelerator")).status === 200);
  check("draft page 404", (await call("GET", "/programs/microsoft-mssa")).status === 404);
  check("missing page 404", (await call("GET", "/programs/nope")).status === 404);
  const arch = await call("GET", "/programs/hoh-corporate-fellowship");
  check("archived page 200 with reason", arch.status === 200 && arch.data.archiveReason?.length > 10);

  const org = await call("GET", "/organizations/vetswhocode");
  check("org with published program", org.status === 200 && org.data.programs.length === 1 && !("id" in org.data));
  const hoh = await call("GET", "/organizations/hoh");
  check("archived-only org: 0 active, 1 archived", hoh.status === 200 && hoh.data.programs.length === 0 && hoh.data.archivedPrograms.length === 1);
  check("drafts-only org 404", (await call("GET", "/organizations/amazon")).status === 404);
  check("missing org 404", (await call("GET", "/organizations/nope")).status === 404);

  // saving
  const u = await signup(call, "save");
  const pid = list.data[0].id;
  check("program-ids needs auth", (await call("GET", "/saved-employers/program-ids")).status === 401);
  check("fresh user: no saved ids", JSON.stringify((await call("GET", "/saved-employers/program-ids", null, u.token)).data) === "[]");
  check("save published 201", (await call("POST", "/saved-employers", { programId: pid }, u.token)).status === 201);
  check("save again 409", (await call("POST", "/saved-employers", { programId: pid }, u.token)).status === 409);
  check("saved id listed", JSON.stringify((await call("GET", "/saved-employers/program-ids", null, u.token)).data) === JSON.stringify([pid]));
  const archId = arch.data.id;
  check("save archived 409", (await call("POST", "/saved-employers", { programId: archId }, u.token)).status === 409);
  const dash = await call("GET", "/dashboard", null, u.token);
  check("dashboard lists save with action items", dash.status === 200 && dash.data.savedPrograms.length === 1 && dash.data.savedPrograms[0].actionItems.length > 0);
  const se = dash.data.savedPrograms[0];
  check("status update", (await call("PATCH", `/saved-employers/${se.id}`, { status: "APPLIED" }, u.token)).status === 200);
  check("bad status 400", (await call("PATCH", `/saved-employers/${se.id}`, { status: "NOPE" }, u.token)).status === 400);
  check("toggle action item", (await call("PATCH", `/action-items/${se.actionItems[0].id}`, { completed: true }, u.token)).status === 200);
  const other = await signup(call, "other");
  check("can't update someone else's save", (await call("PATCH", `/saved-employers/${se.id}`, { status: "OFFER" }, other.token)).status === 404);

  // unsave
  check("unsave needs auth", (await call("DELETE", `/saved-employers/program/${pid}`)).status === 401);
  check("someone else can't unsave it", (await call("DELETE", `/saved-employers/program/${pid}`, null, other.token)).status === 404);
  check("unsave 204", (await call("DELETE", `/saved-employers/program/${pid}`, null, u.token)).status === 204);
  check("unsaved: ids empty", JSON.stringify((await call("GET", "/saved-employers/program-ids", null, u.token)).data) === "[]");
  check("unsaved: dashboard empty", (await call("GET", "/dashboard", null, u.token)).data.savedPrograms.length === 0);
  check("unsave again 404", (await call("DELETE", `/saved-employers/program/${pid}`, null, u.token)).status === 404);
  check("can save again after unsaving", (await call("POST", "/saved-employers", { programId: pid }, u.token)).status === 201);
  check.done(assert);
});
