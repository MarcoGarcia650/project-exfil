// Admin management from the browse pages: archive/unarchive, remove/restore,
// permanent delete (only when unused), organization edit/delete.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, script, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

test("manage listings and organizations", async (t) => {
  const check = checker(t);
  const Adm = await signup(call, "adm"), X = await signup(call, "x");
  script("prisma/make-admin.js", Adm.username);
  const A = (method, path, body) => call(method, path, body ?? null, Adm.token);
  const status = async (id) => one(`select "publishStatus"::text from "Program" where id='${id}'`);

  // Publish Microsoft through review so it has a reviewed content hash.
  const drafts = (await A("GET", "/admin/drafts")).data;
  const ms = drafts.find((d) => d.slug === "microsoft-mssa");
  const amazon = drafts.find((d) => d.slug === "amazon-technical-apprenticeship");
  const fortinet = drafts.find((d) => d.slug === "fortinet-veterans");
  check("publish ms", (await A("POST", `/admin/drafts/${ms.id}/publish`, { contentHash: ms.contentHash })).status === 200);

  // --- access ---
  check("non-admin remove 403", (await call("POST", `/admin/listings/${ms.id}/remove`, {}, X.token)).status === 403);
  check("logged-out delete 401", (await call("DELETE", `/admin/listings/${amazon.id}`)).status === 401);

  // --- archive / unarchive ---
  check("archive needs reason 400", (await A("POST", `/admin/listings/${ms.id}/archive`, { reason: " " })).status === 400);
  check("archive a draft 409", (await A("POST", `/admin/listings/${fortinet.id}/archive`, { reason: "x" })).status === 409);
  check("archive ok", (await A("POST", `/admin/listings/${ms.id}/archive`, { reason: "Applications closed for good." })).status === 200);
  const archivedPage = (await call("GET", "/programs/microsoft-mssa")).data;
  check("archived page shows reason", archivedPage.publishStatus === "ARCHIVED" && archivedPage.archiveReason === "Applications closed for good.");
  check("archived not in browse", !(await call("GET", "/programs")).data.some((p) => p.id === ms.id));
  const unarch = await A("POST", `/admin/listings/${ms.id}/unarchive`);
  check("unarchive → published (content unchanged since review)", unarch.status === 200 && unarch.data.publishStatus === "PUBLISHED");
  check("unarchive clears reason", (await one(`select coalesce("archiveReason",'null') from "Program" where id='${ms.id}'`)) === "null");
  check("unarchive a published listing 409", (await A("POST", `/admin/listings/${ms.id}/unarchive`)).status === 409);

  // --- usage: a user saves and discusses it ---
  check("x saves ms", (await call("POST", "/saved-employers", { programId: ms.id }, X.token)).status === 201);
  check("x comments", (await call("POST", "/programs/microsoft-mssa/comments", { body: "Anyone done this?" }, X.token)).status === 201);
  const usage = (await A("GET", `/admin/listings/${ms.id}/usage`)).data;
  check("usage counted", usage.saves === 1 && usage.comments === 1 && usage.canDelete === false);
  const blocked = await A("DELETE", `/admin/listings/${ms.id}`);
  check("delete in use 409 with reasons", blocked.status === 409 && /1 user has saved it/.test(blocked.data.error) && /1 discussion post/.test(blocked.data.error));

  // --- remove / restore ---
  check("remove a draft 409", (await A("POST", `/admin/listings/${fortinet.id}/remove`)).status === 409);
  check("remove ok", (await A("POST", `/admin/listings/${ms.id}/remove`)).status === 200);
  check("removed: page 404", (await call("GET", "/programs/microsoft-mssa")).status === 404);
  check("removed: not in browse", !(await call("GET", "/programs")).data.some((p) => p.id === ms.id));
  check("removed: comments 404", (await call("GET", "/programs/microsoft-mssa/comments")).status === 404);
  check("removed: org with nothing else public 404", (await call("GET", "/organizations/microsoft")).status === 404);
  const dash = (await call("GET", "/dashboard", null, X.token)).data.savedPrograms.find((s) => s.program.id === ms.id);
  check("removed: dashboard keeps the row, name only", dash?.program.publishStatus === "REMOVED" && !("format" in dash.program));
  const removedList = (await A("GET", "/admin/removed")).data;
  check("listed in Removed with usage", removedList.some((r) => r.id === ms.id && r.removedFromStatus === "PUBLISHED" && r.usage.saves === 1 && !r.canDelete));
  check("summary counts removed", (await A("GET", "/admin/summary")).data.removed === 1);
  const restored = await A("POST", `/admin/removed/${ms.id}/restore`);
  check("restore → published", restored.status === 200 && restored.data.publishStatus === "PUBLISHED");
  check("restored: page back", (await call("GET", "/programs/microsoft-mssa")).status === 200);
  check("restore a non-removed listing 409", (await A("POST", `/admin/removed/${ms.id}/restore`)).status === 409);

  // An archived listing restores to archived.
  await A("POST", `/admin/listings/${ms.id}/archive`, { reason: "Paused." });
  await A("POST", `/admin/listings/${ms.id}/remove`);
  check("archived → removed → archived", (await A("POST", `/admin/removed/${ms.id}/restore`)).data.publishStatus === "ARCHIVED");
  await A("POST", `/admin/listings/${ms.id}/unarchive`);

  // Edited while removed: content no longer matches the review → Drafts.
  await A("POST", `/admin/listings/${ms.id}/remove`);
  const listing = (await A("GET", `/admin/listings/${ms.id}`)).data;
  const edit = await A("PUT", `/admin/listings/${ms.id}`, {
    ...listing, organizationSlug: "microsoft", cost: "Free (edited)", verifiedOn: "2026-11-08", confirmVeteranRoute: true,
  });
  check("edit while removed keeps it removed", edit.status === 200 && edit.data.publishStatus === "REMOVED");
  check("restore after edit → draft", (await A("POST", `/admin/removed/${ms.id}/restore`)).data.publishStatus === "DRAFT");

  // --- permanent delete of an unused listing ---
  check("unused: canDelete", (await A("GET", `/admin/listings/${amazon.id}/usage`)).data.canDelete === true);
  check("delete unused 200", (await A("DELETE", `/admin/listings/${amazon.id}`)).status === 200);
  check("deleted: gone", (await A("GET", `/admin/listings/${amazon.id}`)).status === 404);
  check("delete again 404", (await A("DELETE", `/admin/listings/${amazon.id}`)).status === 404);

  // --- organizations ---
  const vwc = (await A("GET", "/admin/organizations/vetswhocode")).data;
  check("org admin view", vwc.totalListings === 1 && vwc.listings.PUBLISHED === 1 && vwc.canDelete === false);
  check("org edit non-admin 403", (await call("PUT", `/admin/organizations/${vwc.id}`, { name: "x" }, X.token)).status === 403);
  check("org edit needs name 400", (await A("PUT", `/admin/organizations/${vwc.id}`, { name: "", websiteUrl: "" })).status === 400);
  check("org edit https only 400", (await A("PUT", `/admin/organizations/${vwc.id}`, { name: "VWC", websiteUrl: "http://vetswhocode.io" })).status === 400);
  check("org edit ok", (await A("PUT", `/admin/organizations/${vwc.id}`, { name: "Vets Who Code (edited)", websiteUrl: "https://vetswhocode.io/about" })).status === 200);
  const pubOrg = (await call("GET", "/organizations/vetswhocode")).data;
  check("org edit public", pubOrg.name === "Vets Who Code (edited)" && pubOrg.websiteUrl === "https://vetswhocode.io/about");
  check("org marked edited in app", (await one(`select ("editedInAppAt" is not null)::text from "Organization" where slug='vetswhocode'`)) === "true");
  const blockedOrg = await A("DELETE", `/admin/organizations/${vwc.id}`);
  check("delete org with listings 409", blockedOrg.status === 409 && /1 listing/.test(blockedOrg.data.error));
  const amazonOrg = (await A("GET", "/admin/organizations/amazon")).data;
  check("empty org can delete", amazonOrg.totalListings === 0 && amazonOrg.canDelete === true);
  check("delete empty org 200", (await A("DELETE", `/admin/organizations/${amazonOrg.id}`)).status === 200);
  check("deleted org gone", (await A("GET", "/admin/organizations/amazon")).status === 404);

  check("fortinet untouched", (await status(fortinet.id)) === "DRAFT");
  check.done(assert);
});
