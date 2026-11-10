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
