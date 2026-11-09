import crypto from "node:crypto";

// Fields that make up a listing's *content* — what a reviewer reads before
// clicking "Approve & publish". Status, review metadata and verifiedOn are
// deliberately excluded: re-verifying a listing (newer verifiedOn, same
// facts) must not send it back to review.
export const CONTENT_FIELDS = [
  "organizationSlug",
  "name",
  "description",
  "format",
  "techTracks",
  "veteranAccessRoute",
  "eligibilityNotes",
  "prerequisites",
  "remoteAvailability",
  "locations",
  "cost",
  "duration",
  "applicationAvailability",
  "applicationTiming",
  "applicationUrl",
  "officialSourceUrl",
  "skillbridgeNote",
];

// Stable SHA-256 over the content fields. Arrays are kept in order (track
// order is meaningful to the reviewer); keys are emitted in CONTENT_FIELDS
// order so the hash doesn't depend on object key order.
export function contentHashFor(content) {
  const canonical = CONTENT_FIELDS.map((key) => [key, content[key] ?? null]);
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
