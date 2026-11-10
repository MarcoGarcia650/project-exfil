import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateUsername, validatePassword, validateEmail, normalizeEmail, parseSignup, usernameKey,
} from "../src/lib/accountRules.js";

test("usernames: valid shapes", () => {
  for (const u of ["abc", "Marco_G", "a1234567890123456789", "Devil_Dog_0311"]) {
    assert.equal(validateUsername(u), null, u);
  }
});

test("usernames: invalid shapes", () => {
  for (const u of ["", "ab", "1abc", "_abc", "a".repeat(21), "has space", "dash-name", "me@x.com", "Mаrco" /* Cyrillic а */]) {
    assert.notEqual(validateUsername(u), null, JSON.stringify(u));
  }
  assert.notEqual(validateUsername(undefined), null);
  assert.notEqual(validateUsername(42), null);
});

test("usernames: reserved names blocked in any case", () => {
  for (const u of ["admin", "ADMIN", "Moderator", "projectExfil", "Null"]) {
    assert.equal(validateUsername(u), "That username is reserved", u);
  }
});

test("usernameKey lowercases for case-insensitive uniqueness", () => {
  assert.equal(usernameKey("Marco_G"), usernameKey("marco_g"));
});

test("passwords: length bounds, including bcrypt's 72-byte limit", () => {
  assert.notEqual(validatePassword("short7!"), null);
  assert.equal(validatePassword("eightchr"), null);
  assert.equal(validatePassword("a".repeat(72)), null);
  assert.notEqual(validatePassword("a".repeat(73)), null);
  assert.notEqual(validatePassword("é".repeat(37)), null); // 74 bytes, 37 chars
  assert.notEqual(validatePassword(undefined), null);
});

test("emails: normalized and loosely validated", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(validateEmail("a@b.co"), null);
  for (const e of ["", "nope", "a@b", "a b@c.com", "@b.com"]) assert.notEqual(validateEmail(e), null, e);
});

test("parseSignup: normalizes a good body", () => {
  const { error, data } = parseSignup({
    email: " Vet@Example.com ", password: "longenough", username: "Vet_1",
    branch: "MARINES", targetField: "  Cloud  ",
  });
  assert.equal(error, undefined);
  assert.equal(data.email, "vet@example.com");
  assert.equal(data.targetField, "Cloud");
  assert.equal(data.separationDate, null);
});

test("parseSignup: rejects bad branch, date and missing username", () => {
  const base = { email: "v@e.com", password: "longenough", username: "Vet_1", branch: "MARINES" };
  assert.ok(parseSignup({ ...base, branch: "JEDI" }).error);
  assert.ok(parseSignup({ ...base, separationDate: "not-a-date" }).error);
  assert.ok(parseSignup({ ...base, username: undefined }).error);
  assert.ok(parseSignup({ ...base, targetField: "x".repeat(101) }).error);
  assert.ok(parseSignup(undefined).error);
});
