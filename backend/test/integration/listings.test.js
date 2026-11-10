// Admin "Add listing": creates a hidden DRAFT that goes through review.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, client, checker, one, script, signup } from "./harness.js";

let call;
before(async () => ({ call } = { call: client((await setup()).base) }));
after(teardown);

const listing = (over = {}) => ({
  organizationSlug: "vetswhocode",
  name: "Vets Who Code Data Track",
  description: "A free data program for veterans.",
  format: "TRAINING",
  techTracks: ["DATA"],
  veteranAccessRoute: "Veterans apply directly on the official page.",
  officialSourceUrl: "https://example.org/data",
  verifiedOn: new Date().toISOString().slice(0, 10),
  confirmVeteranRoute: true,
  ...over,
});

test("admin add listing", async (t) => {
  const check = checker(t);
  const Adm = await signup(call, "ladm"), U = await signup(call, "lu");
  script("prisma/make-admin.js", Adm.username);
  const add = (body, tok = Adm.token) => call("POST", "/admin/listings", body, tok);

  check("non-admin 403", (await add(listing(), U.token)).status === 403);
  check("orgs list for picker", (await call("GET", "/admin/organizations", null, Adm.token)).data.some((o) => o.slug === "vetswhocode"));
  check("missing route 400", (await add(listing({ veteranAccessRoute: "" }))).status === 400);
  check("unconfirmed route 400", (await add(listing({ confirmVeteranRoute: false }))).status === 400);
  check("unknown org 400", (await add(listing({ organizationSlug: "nope" }))).status === 400);

  const created = await add(listing());
  check("created 201 as DRAFT", created.status === 201 && created.data.publishStatus === "DRAFT" && created.data.slug === "vets-who-code-data-track", created);
  check("hidden publicly", (await call("GET", `/programs/${created.data.slug}`)).status === 404);
  const drafts = (await call("GET", "/admin/drafts", null, Adm.token)).data;
  const d = drafts.find((x) => x.slug === created.data.slug);
  check("in Drafts to review, not awaiting research", d && d.awaitingResearch === false && d.contentHash.length === 64);
  check("duplicate slug 409", (await add(listing())).status === 409);
  check("same org + name, other slug 409", (await add(listing({ slug: "another-slug" }))).status === 409);
  check("publish via the normal gate", (await call("POST", `/admin/drafts/${d.id}/publish`, { contentHash: d.contentHash }, Adm.token)).status === 200);
  check("now public", (await call("GET", `/programs/${created.data.slug}`)).status === 200);

  const withNewOrg = await add(listing({ organizationSlug: undefined, newOrganization: { name: "Acme Vets", websiteUrl: "https://acme.example" }, name: "Acme Cloud", description: "Guaranteed interviews." }));
  check("new organization created with listing", withNewOrg.status === 201 && (await one(`select name from "Organization" where slug='acme-vets'`)) === "Acme Vets");
  check("guarantee warning returned", withNewOrg.data.warnings?.length === 1);
  check("existing org slug as new org 409", (await add(listing({ organizationSlug: undefined, newOrganization: { name: "Acme Vets" }, name: "Other" }))).status === 409);
  check.done(assert);
});

test("admin edit listing", async (t) => {
  const check = checker(t);
  const Adm = await signup(call, "eadm"), U = await signup(call, "eu");
  script("prisma/make-admin.js", Adm.username);
  const pubId = await one(`select id from "Program" where slug='vetswhocode-accelerator'`);
  const get = (id, tok = Adm.token) => call("GET", `/admin/listings/${id}`, null, tok);
  const put = (id, body, tok = Adm.token) => call("PUT", `/admin/listings/${id}`, body, tok);
  const cur = (await get(pubId)).data;
  const editable = {
    name: cur.name, description: cur.description, format: cur.format, techTracks: cur.techTracks,
    veteranAccessRoute: cur.veteranAccessRoute, officialSourceUrl: cur.officialSourceUrl,
    applicationUrl: cur.applicationUrl, applicationAvailability: cur.applicationAvailability,
    verifiedOn: cur.verifiedOn.slice(0, 10), confirmVeteranRoute: true,
  };

  check("non-admin get 403", (await get(pubId, U.token)).status === 403);
  check("non-admin put 403", (await put(pubId, editable, U.token)).status === 403);
  check("missing 404", (await get("nope")).status === 404);
  check("still needs confirmation", (await put(pubId, { ...editable, techTracks: ["SOFTWARE_DEV", "CLOUD"], confirmVeteranRoute: false })).status === 400);

  const r = await put(pubId, { ...editable, techTracks: ["SOFTWARE_DEV", "CLOUD"] });
  check("edit published → stays PUBLISHED", r.status === 200 && r.data.changed && r.data.publishStatus === "PUBLISHED", r);
  check("re-saving the same content → changed:false", (await put(pubId, { ...editable, techTracks: ["SOFTWARE_DEV", "CLOUD"] })).data?.changed === false);
  const live = (await call("GET", "/programs/vetswhocode-accelerator")).data;
  check("public page shows the edit", live.techTracks.join() === "SOFTWARE_DEV,CLOUD");
  check("review + app-edit recorded", (await one(`select ("reviewedContentHash"="contentHash" and "reviewedById"='${Adm.id}' and "editedInAppAt" is not null)::text from "Program" where id='${pubId}'`)) === "true");
  check("slug and org can't change", (await put(pubId, { ...editable, slug: "hijack", organizationSlug: "hoh", name: cur.name })).status === 200 && (await one(`select slug||'/'||(select slug from "Organization" o where o.id="organizationId") from "Program" where id='${pubId}'`)) === "vetswhocode-accelerator/vetswhocode");

  // rejected → back to draft
  const fort = (await call("GET", "/admin/drafts", null, Adm.token)).data.find((d) => d.slug === "fortinet-veterans");
  await call("POST", `/admin/drafts/${fort.id}/reject`, { reason: "wrong", contentHash: fort.contentHash }, Adm.token);
  const fCur = (await get(fort.id)).data;
  const fix = await put(fort.id, { name: fCur.name, description: "Fixed description.", format: fCur.format, techTracks: fCur.techTracks, veteranAccessRoute: fCur.veteranAccessRoute, officialSourceUrl: fCur.officialSourceUrl, verifiedOn: fCur.verifiedOn.slice(0, 10), confirmVeteranRoute: true });
  check("edit rejected → DRAFT again", fix.data?.publishStatus === "DRAFT");
  check("rejection cleared", (await one(`select coalesce("rejectionReason",'none') from "Program" where id='${fort.id}'`)) === "none");
  check.done(assert);
});
