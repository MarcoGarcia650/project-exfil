import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCommentBody, parseReportReason, parseSubmissionBody, parseSourceUrl,
  encodeCursor, decodeCursor, afterCursor, COMMENT_MAX,
} from "../src/lib/communityRules.js";

test("comment body: trimmed, 1–2000 chars", () => {
  assert.equal(parseCommentBody("  hi  ").value, "hi");
  assert.ok(parseCommentBody("   ").error);
  assert.ok(parseCommentBody(undefined).error);
  assert.ok(parseCommentBody(42).error);
  assert.equal(parseCommentBody("x".repeat(COMMENT_MAX)).value.length, COMMENT_MAX);
  assert.ok(parseCommentBody("x".repeat(COMMENT_MAX + 1)).error);
});

test("report reason and submission body limits", () => {
  assert.ok(parseReportReason("x".repeat(501)).error);
  assert.equal(parseReportReason("spam").value, "spam");
  assert.ok(parseSubmissionBody("x".repeat(5001)).error);
  assert.ok(parseSubmissionBody("").error);
});

test("source URL: optional, http(s) only", () => {
  assert.equal(parseSourceUrl(undefined).value, null);
  assert.equal(parseSourceUrl("").value, null);
  assert.equal(parseSourceUrl("https://example.com/a").value, "https://example.com/a");
  for (const bad of ["javascript:alert(1)", "example.com", "ftp://x.com", "x".repeat(501), 5]) {
    assert.ok(parseSourceUrl(bad).error, String(bad));
  }
});

test("cursor round-trips and rejects garbage", () => {
  const row = { createdAt: new Date("2026-11-09T12:00:00.000Z"), id: "abc" };
  assert.deepEqual(decodeCursor(encodeCursor(row)), row);
  assert.equal(decodeCursor(undefined), null);
  assert.equal(decodeCursor("not-base64-json"), null);
  assert.equal(decodeCursor(Buffer.from('["nope", 1]').toString("base64url")), null);
});

test("afterCursor: strictly after (createdAt, id)", () => {
  assert.deepEqual(afterCursor(null), {});
  const c = { createdAt: new Date(0), id: "m" };
  assert.deepEqual(afterCursor(c), {
    OR: [{ createdAt: { gt: c.createdAt } }, { createdAt: c.createdAt, id: { gt: "m" } }],
  });
});
