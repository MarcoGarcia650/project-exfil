// Limits for user-generated content (research/SCHEMA_PROPOSAL.md → limits).
// Pure validators: return an error message, or null when valid.

export const COMMENT_MAX = 2000;
export const SUBMISSION_MAX = 5000;
export const REPORT_REASON_MAX = 500;
export const SOURCE_URL_MAX = 500;
export const COMMENTS_PAGE_SIZE = 20; // top-level per page, and replies per parent
export const THREAD_DEPTH = 3; // reply levels returned (and indented) below a root

// Posting limits, counted from the DB so they survive restarts.
export const RATE = {
  comment: { limit: 5, windowMs: 10 * 60 * 1000, label: "5 comments per 10 minutes" },
  submission: { limit: 10, windowMs: 24 * 3600 * 1000, label: "10 submissions per day" },
  report: { limit: 30, windowMs: 24 * 3600 * 1000, label: "30 reports per day" },
  contact: { limit: 5, windowMs: 24 * 3600 * 1000, label: "5 messages per day" },
};

// Trims and checks a required text field.
function text(value, max, what) {
  if (typeof value !== "string" || !value.trim()) return { error: `${what} can't be empty` };
  const trimmed = value.trim();
  if (trimmed.length > max) return { error: `${what} must be at most ${max.toLocaleString("en-US")} characters` };
  return { value: trimmed };
}

export const parseCommentBody = (v) => text(v, COMMENT_MAX, "Comment");
export const parseSubmissionBody = (v) => text(v, SUBMISSION_MAX, "Details");
export const parseReportReason = (v) => text(v, REPORT_REASON_MAX, "Reason");

// Optional http(s) URL. A lead for the admin, never treated as evidence.
export function parseSourceUrl(value) {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" || value.length > SOURCE_URL_MAX) return { error: "Link is too long" };
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return { value: url.toString() };
  } catch {
    return { error: "Link must be a full http(s) URL" };
  }
}

// Keyset cursor over (createdAt, id), oldest first. Opaque to clients.
export function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.createdAt.toISOString(), row.id])).toString("base64url");
}

export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const [iso, id] = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime()) || typeof id !== "string") return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

// Prisma `where` fragment for rows strictly after the cursor.
export function afterCursor(cursor) {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { gt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { gt: cursor.id } },
    ],
  };
}

export const CONTACT_SUBJECT_MAX = 120;
export const CONTACT_BODY_MAX = 3000;
export const parseContactSubject = (v) => text(v, CONTACT_SUBJECT_MAX, "Subject");
export const parseContactBody = (v) => text(v, CONTACT_BODY_MAX, "Message");
