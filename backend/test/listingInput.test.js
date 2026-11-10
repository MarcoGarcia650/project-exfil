import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingInput, slugify } from "../src/lib/listingInput.js";

const good = {
  organizationSlug: "vetswhocode",
  name: "Vets Who Code Data Track",
  description: "A free data program.",
  format: "TRAINING",
  techTracks: ["DATA"],
  veteranAccessRoute: "Veterans apply directly.",
  officialSourceUrl: "https://example.org/data",
  verifiedOn: "2026-11-09",
  confirmVeteranRoute: true,
};
const today = new Date("2026-11-10T12:00:00Z");
const parse = (over) => parseListingInput({ ...good, ...over }, { today });

test("slugify", () => {
  assert.equal(slugify("Microsoft Software & Systems Academy (MSSA)"), "microsoft-software-and-systems-academy-mssa");
  assert.equal(slugify("  Café  Programs!! "), "cafe-programs");
});

test("valid input → data with derived slug and defaults", () => {
  const { error, data, warnings } = parse({});
  assert.equal(error, undefined);
  assert.equal(data.slug, "vets-who-code-data-track");
  assert.equal(data.applicationAvailability, "UNKNOWN");
  assert.equal(data.eligibilityNotes, null);
  assert.deepEqual(warnings, []);
});

test("required fields and trust rules", () => {
  assert.ok(parse({ name: " " }).error);
  assert.ok(parse({ veteranAccessRoute: "" }).error);
  assert.ok(parse({ officialSourceUrl: "" }).error);
  assert.ok(parse({ officialSourceUrl: "http://example.org" }).error, "https only");
  assert.ok(parse({ applicationUrl: "javascript:alert(1)" }).error);
  assert.ok(parse({ techTracks: [] }).error);
  assert.ok(parse({ techTracks: ["BOGUS"] }).error);
  assert.ok(parse({ format: "NOPE" }).error);
  assert.ok(parse({ confirmVeteranRoute: false }).error);
  assert.ok(parse({ verifiedOn: "" }).error);
  assert.ok(parse({ verifiedOn: "2026-12-01" }).error, "future date");
  assert.equal(parse({ verifiedOn: "2026-11-10" }).error, undefined, "today is fine");
  assert.ok(parse({ slug: "Bad Slug!" }).error);
  assert.ok(parse({ remoteAvailability: "moon" }).error);
});

test("new organization", () => {
  const r = parse({ organizationSlug: undefined, newOrganization: { name: "Acme Vets", websiteUrl: "https://acme.example" } });
  assert.deepEqual(r.data.organization, { newOrg: { name: "Acme Vets", slug: "acme-vets", websiteUrl: "https://acme.example/" } });
  assert.ok(parse({ organizationSlug: undefined, newOrganization: { name: "" } }).error);
});

test("guarantee language warns, doesn't block", () => {
  const r = parse({ description: "Guaranteed interview with partners." });
  assert.equal(r.error, undefined);
  assert.equal(r.warnings.length, 1);
});
