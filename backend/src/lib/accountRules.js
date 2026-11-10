// Account input rules (research/SCHEMA_PROPOSAL.md → "Accounts").
// Pure functions: each returns an error message string, or null if valid.

export const BRANCHES = ["ARMY", "NAVY", "AIR_FORCE", "MARINES", "COAST_GUARD", "SPACE_FORCE", "MILITARY_SPOUSE"];

// Checked against the lowercase key, so "Admin" and "ADMIN" are caught too.
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "mod", "moderator", "staff", "support", "help", "official",
  "system", "root", "exfil", "projectexfil", "deleted", "removed", "null", "undefined",
]);

export const PASSWORD_MIN = 8;
// bcrypt silently ignores everything past 72 bytes, so longer passwords
// would give a false sense of strength. Reject them instead.
export const PASSWORD_MAX_BYTES = 72;
export const TARGET_FIELD_MAX = 100;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Deliberately loose: one @, something on each side, a dot in the domain,
// no spaces. Real validation is the user receiving mail, which comes later.
export function validateEmail(email) {
  if (!email) return "Email is required";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    return `Password must be at most ${PASSWORD_MAX_BYTES} bytes`;
  }
  return null;
}

// 3–20 characters: letters, digits, underscore; must start with a letter.
// ASCII only, so no look-alike Unicode and nothing email-shaped.
export function validateUsername(username) {
  if (typeof username !== "string" || !username) return "Username is required";
  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username)) {
    return "Username must be 3–20 characters: letters, numbers or underscores, starting with a letter";
  }
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return "That username is reserved";
  return null;
}

export const usernameKey = (username) => username.toLowerCase();

// Validates and normalizes a signup body. Returns { error } or { data }.
export function parseSignup(body = {}) {
  const email = normalizeEmail(body.email);
  const targetField = typeof body.targetField === "string" ? body.targetField.trim() : "";
  const checks = [
    validateEmail(email),
    validatePassword(body.password),
    validateUsername(body.username),
    BRANCHES.includes(body.branch) ? null : "Choose a branch",
    targetField.length > TARGET_FIELD_MAX ? `Target field must be at most ${TARGET_FIELD_MAX} characters` : null,
  ];

  let separationDate = null;
  if (body.separationDate) {
    separationDate = new Date(body.separationDate);
    if (Number.isNaN(separationDate.getTime())) checks.push("Separation date is not a valid date");
  }

  const error = checks.find(Boolean);
  if (error) return { error };
  return {
    data: {
      email,
      password: body.password,
      username: body.username,
      branch: body.branch,
      targetField: targetField || null,
      separationDate,
    },
  };
}
