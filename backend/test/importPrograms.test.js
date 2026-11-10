// Tests for the import state-transition table (planFor is pure — no DB).
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { planFor } from "../prisma/import-programs.js";

const staging = JSON.parse(fs.readFileSync(new URL("../../research/programs-staging.json", import.meta.url), "utf8"));
const base = staging.programs.find((p) => p.id === "vetswhocode-accelerator");
const rec = (overrides = {}) => ({ ...structuredClone(base), ...overrides });

// Simulate the DB row the importer would have created for `r`.
function rowFrom(r, status, extra = {}) {
  const { data } = planFor(r, null);
  return { ...data, publishStatus: status, ...extra };
}

test("new record is created as DRAFT, never published", () => {
  const p = planFor(rec(), null);
  assert.equal(p.action, "CREATE_DRAFT");
  assert.equal(p.data.publishStatus, "DRAFT");
});

test("unchanged content keeps state, even when PUBLISHED", () => {
  const existing = rowFrom(rec(), "PUBLISHED", { reviewedContentHash: "h", reviewedById: "admin" });
  assert.equal(planFor(rec(), existing).action, "UNCHANGED");
});

test("re-verification with same facts only bumps verifiedOn (no unpublish)", () => {
  const existing = rowFrom(rec(), "PUBLISHED");
  const p = planFor(rec({ verifiedOn: "2027-02-01" }), existing);
  assert.equal(p.action, "BUMP_VERIFIED_ON");
  assert.deepEqual(Object.keys(p.data), ["verifiedOn"]);
});

test("changed content on PUBLISHED goes back to DRAFT and clears review", () => {
  const existing = rowFrom(rec(), "PUBLISHED", { reviewedById: "admin", reviewedAt: new Date(), reviewedContentHash: "old" });
  const p = planFor(rec({ cost: "Now $500" }), existing);
  assert.equal(p.action, "UPDATE_AND_UNPUBLISH");
  assert.equal(p.data.publishStatus, "DRAFT");
  assert.equal(p.data.reviewedById, null);
  assert.equal(p.data.reviewedContentHash, null);
});

test("changed content on DRAFT stays DRAFT", () => {
  const existing = rowFrom(rec(), "DRAFT");
  const p = planFor(rec({ duration: "18 weeks" }), existing);
  assert.equal(p.action, "UPDATE_DRAFT");
  assert.equal(p.data.publishStatus, undefined); // status untouched
});

test("changed content on ARCHIVED stays ARCHIVED (never silently republished)", () => {
  const existing = rowFrom(rec(), "ARCHIVED", { archiveReason: "ended" });
  const p = planFor(rec({ duration: "18 weeks" }), existing);
  assert.equal(p.action, "UPDATE_ARCHIVED");
  assert.notEqual(p.data.publishStatus, "PUBLISHED");
  assert.equal(p.data.publishStatus, undefined);
});

test("archiveReason in staging archives a live listing", () => {
  const existing = rowFrom(rec(), "PUBLISHED");
  const p = planFor(rec({ archiveReason: "Program ended" }), existing);
  assert.equal(p.action, "ARCHIVE");
  assert.equal(p.data.publishStatus, "ARCHIVED");
  assert.equal(p.data.archiveReason, "Program ended");
});

test("restore: true moves ARCHIVED to DRAFT (not PUBLISHED) and clears review", () => {
  const existing = rowFrom(rec(), "ARCHIVED", { archiveReason: "ended", reviewedById: "admin" });
  const p = planFor(rec({ restore: true }), existing);
  assert.equal(p.action, "RESTORE_TO_DRAFT");
  assert.equal(p.data.publishStatus, "DRAFT");
  assert.equal(p.data.archiveReason, null);
  assert.equal(p.data.reviewedById, null);
});

test("'unknown' staging values become null", () => {
  const p = planFor(rec({ prerequisites: "unknown" }), null);
  assert.equal(p.data.prerequisites, null);
});

test("an older verifiedOn never overwrites a newer one", () => {
  const existing = rowFrom(rec({ verifiedOn: "2027-01-01" }), "PUBLISHED");
  const p = planFor(rec({ verifiedOn: "2026-11-08", cost: "changed" }), existing);
  assert.equal(p.data.verifiedOn.toISOString().slice(0, 10), "2027-01-01");
});

test("a legacy draft awaiting research is replaced by verified content, clearing the flag", () => {
  // Same content hash as staging, but the row came from the legacy backfill.
  const existing = rowFrom(rec(), "DRAFT", { awaitingResearch: true });
  const p = planFor(rec(), existing);
  assert.equal(p.action, "UPDATE_DRAFT");
  assert.equal(p.data.awaitingResearch, false);
  assert.equal(p.data.publishStatus, undefined); // stays DRAFT; only Approve & publish publishes
});

test("every content write marks the row as verified research", () => {
  assert.equal(planFor(rec(), null).data.awaitingResearch, false);
});

test("REJECTED with unchanged content stays rejected", () => {
  const existing = rowFrom(rec(), "REJECTED", { rejectedAt: new Date(), rejectionReason: "cost wrong" });
  assert.equal(planFor(rec(), existing).action, "UNCHANGED");
});

test("REJECTED with fixed content returns to DRAFT and clears the rejection", () => {
  const existing = rowFrom(rec(), "REJECTED", { rejectedAt: new Date(), rejectionReason: "cost wrong" });
  const p = planFor(rec({ cost: "Free" }), existing);
  assert.equal(p.action, "RESUBMIT_REJECTED");
  assert.equal(p.data.publishStatus, "DRAFT");
  assert.equal(p.data.rejectedAt, null);
  assert.equal(p.data.rejectionReason, null);
});

test("REJECTED is never archived (or published) by staging", () => {
  const existing = rowFrom(rec(), "REJECTED");
  const p = planFor(rec({ archiveReason: "ended" }), existing);
  assert.notEqual(p.data?.publishStatus, "ARCHIVED");
  assert.notEqual(p.data?.publishStatus, "PUBLISHED");
});
