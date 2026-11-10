// The ONLY statuses visible to the public. Everything else — DRAFT
// (awaiting review) and REJECTED (failed review) — is treated exactly like
// a missing listing on public endpoints. Allow-list on purpose: a status
// added later stays hidden until it's deliberately listed here.
export const PUBLIC_STATUSES = ["PUBLISHED", "ARCHIVED"];

export const isPublicStatus = (status) => PUBLIC_STATUSES.includes(status);
