// Validate research/programs-staging.json before any human review or import.
//
// Usage:  node research/scripts/validate-staging.mjs [path] [--today=YYYY-MM-DD]
//   or:   import { validateStaging } from ".../validate-staging.mjs"
//
// Read-only: this never touches the database. The CLI exits non-zero on
// errors; backend/prisma/import-programs.js calls validateStaging() and
// refuses to import if it returns any errors.
//
// Three kinds of checks:
//   1. Shape   — required fields present, enum values legal, URLs parse.
//   2. Trust   — a record can't claim more than its evidence supports
//                (e.g. SOURCE_VERIFIED needs an official source + verifiedOn).
//   3. Hygiene — duplicate detection and stale verification dates.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Re-verify anything older than this. 90 days ≈ one quarterly review cycle.
const STALE_AFTER_DAYS = 90;

const ENUMS = {
  techTracks: ["SOFTWARE_DEV", "IT_SUPPORT", "CLOUD", "CYBERSECURITY", "DATA", "unknown"],
  programFormat: ["TRAINING", "CERTIFICATION_TRAINING", "FELLOWSHIP", "INTERNSHIP", "APPRENTICESHIP", "DIRECT_HIRE"],
  eligibleAudiences: ["ACTIVE_DUTY_TRANSITIONING", "VETERAN", "GUARD_RESERVE", "RETIREE", "MILITARY_SPOUSE", "OTHER", "unknown"],
  applicationStatus: ["ACCEPTING", "ROLLING", "CLOSED", "UNKNOWN"], // = app's ApplicationAvailability
  reviewStatus: ["SOURCE_VERIFIED", "NEEDS_RESEARCH", "OUT_OF_SCOPE", "APPROVED"],
  veteranAccess: ["VERIFIED", "UNVERIFIED", "ACTIVE_DUTY_ONLY"],
  skillbridge: ["DIRECTORY_CONFIRMED", "PROVIDER_STATED", "THIRD_PARTY_ONLY", "NOT_STATED", "UNKNOWN"],
  remoteAvailability: ["remote", "in_person", "hybrid", "varies", "unknown"],
  evidenceKind: ["official", "third_party", "search_snippet"],
};

// Fields that must exist and be non-empty. "unknown" is an allowed value —
// an empty string is not, because it hides whether anyone looked.
const REQUIRED = [
  "id", "organizationId", "programName", "description", "techTracks", "programFormat",
  "skillbridge", "eligibleAudiences", "eligibilityNotes", "veteranAccess", "prerequisites",
  "location", "cost", "duration", "applicationTiming", "applicationStatus",
  "officialSourceUrl", "applicationUrl", "reviewStatus", "evidence",
];

export function validateStaging(data, { today = new Date() } = {}) {
const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

function isUrlOrUnknown(value) {
  if (value === "unknown") return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// Normalize a name for duplicate detection: case, punctuation and filler
// words shouldn't make "Microsoft Software & Systems Academy (MSSA)" and
// "microsoft software and systems academy" look like different programs.
function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|program|programme|for|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Compare URLs ignoring scheme, "www.", trailing slash and query string.
function normalizeUrl(u) {
  try {
    const url = new URL(u);
    return (url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return null;
  }
}

const orgIds = new Set(data.organizations.map((o) => o.id));
const seenIds = new Set();
const seenNames = new Map(); // normalized org+name -> id
const seenUrls = new Map(); // normalized officialSourceUrl -> id

for (const p of data.programs) {
  const id = p.id ?? "(missing id)";

  // ---- 1. Shape ----
  for (const field of REQUIRED) {
    if (p[field] === undefined || p[field] === null || p[field] === "") err(id, `missing ${field}`);
  }
  if (seenIds.has(id)) err(id, "duplicate id");
  seenIds.add(id);
  if (!orgIds.has(p.organizationId)) err(id, `unknown organizationId ${p.organizationId}`);

  for (const t of p.techTracks ?? []) if (!ENUMS.techTracks.includes(t)) err(id, `bad techTrack ${t}`);
  for (const a of p.eligibleAudiences ?? []) if (!ENUMS.eligibleAudiences.includes(a)) err(id, `bad audience ${a}`);
  if (!ENUMS.programFormat.includes(p.programFormat)) err(id, `bad programFormat ${p.programFormat}`);
  if (!ENUMS.applicationStatus.includes(p.applicationStatus)) err(id, `bad applicationStatus ${p.applicationStatus}`);
  if (!ENUMS.reviewStatus.includes(p.reviewStatus)) err(id, `bad reviewStatus ${p.reviewStatus}`);
  if (!ENUMS.veteranAccess.includes(p.veteranAccess?.status)) err(id, `bad veteranAccess.status`);
  if (!ENUMS.skillbridge.includes(p.skillbridge?.status)) err(id, `bad skillbridge.status`);
  if (!ENUMS.remoteAvailability.includes(p.location?.remoteAvailability)) err(id, `bad location.remoteAvailability`);
  if (!isUrlOrUnknown(p.officialSourceUrl)) err(id, `officialSourceUrl not https or "unknown"`);
  if (!isUrlOrUnknown(p.applicationUrl)) err(id, `applicationUrl not https or "unknown"`);
  for (const e of p.evidence ?? []) {
    if (!ENUMS.evidenceKind.includes(e.kind)) err(id, `bad evidence kind ${e.kind}`);
    if (!isUrlOrUnknown(e.url)) err(id, `bad evidence url ${e.url}`);
  }

  // ---- 2. Trust rules ----
  // Scope rule (user decision 2026-11-08): post-separation veteran access required.
  if (p.veteranAccess?.status === "ACTIVE_DUTY_ONLY") err(id, "active-duty-only programs belong in `excluded`, not `programs`");
  if (p.veteranAccess?.status === "VERIFIED" && !p.veteranAccess.sourceUrl) err(id, "veteranAccess VERIFIED without sourceUrl");

  if (p.reviewStatus === "SOURCE_VERIFIED" || p.reviewStatus === "APPROVED") {
    if (!p.verifiedOn) err(id, `${p.reviewStatus} requires verifiedOn`);
    if (!p.evidence?.some((e) => e.kind === "official" && e.supports?.length)) err(id, `${p.reviewStatus} requires official evidence that supports at least one field`);
    if (p.veteranAccess?.status !== "VERIFIED") err(id, `${p.reviewStatus} requires veteranAccess VERIFIED`);
    if (p.officialSourceUrl === "unknown") err(id, `${p.reviewStatus} requires an officialSourceUrl`);
  }
  if (p.reviewStatus === "APPROVED" && !p.reviewedBy) err(id, "APPROVED requires reviewedBy (human reviewer)");
  if (p.skillbridge?.status === "DIRECTORY_CONFIRMED" && !p.skillbridge.sourceUrl?.includes("skillbridge.osd.mil")) {
    err(id, "DIRECTORY_CONFIRMED must cite skillbridge.osd.mil");
  }
  // Don't let outcome copy imply a job: flag guarantee language for a human to read.
  if (/guarantee/i.test(p.description)) warn(id, "description mentions 'guarantee' — check it isn't implying employment");

  // ---- 3. Hygiene ----
  const nameKey = `${p.organizationId}|${normalizeName(p.programName ?? "")}`;
  if (seenNames.has(nameKey)) err(id, `possible duplicate of ${seenNames.get(nameKey)} (same org + normalized name)`);
  seenNames.set(nameKey, id);

  const urlKey = p.officialSourceUrl !== "unknown" ? normalizeUrl(p.officialSourceUrl) : null;
  if (urlKey && seenUrls.has(urlKey)) warn(id, `shares officialSourceUrl with ${seenUrls.get(urlKey)} — duplicate or legitimately one page for two programs?`);
  if (urlKey) seenUrls.set(urlKey, id);

  if (p.verifiedOn) {
    const ageDays = (today - new Date(p.verifiedOn)) / 86_400_000;
    if (ageDays > STALE_AFTER_DAYS) warn(id, `verifiedOn ${p.verifiedOn} is ${Math.floor(ageDays)} days old — re-verify`);
  }
}

const count = (s) => data.programs.filter((p) => p.reviewStatus === s).length;
return {
  errors,
  warnings,
  counts: {
    programs: data.programs.length,
    SOURCE_VERIFIED: count("SOURCE_VERIFIED"),
    NEEDS_RESEARCH: count("NEEDS_RESEARCH"),
    OUT_OF_SCOPE: count("OUT_OF_SCOPE"),
    APPROVED: count("APPROVED"),
    excluded: data.excluded.length,
  },
};
}

// ---- CLI (only when run directly, not when imported) ----
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? "research/programs-staging.json";
const todayArg = args.find((a) => a.startsWith("--today="))?.split("=")[1];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const { errors, warnings, counts } = validateStaging(data, { today: todayArg ? new Date(todayArg) : new Date() });
console.log(`File: ${file}`);
console.log(
  `Programs: ${counts.programs} (SOURCE_VERIFIED ${counts.SOURCE_VERIFIED}, NEEDS_RESEARCH ${counts.NEEDS_RESEARCH}, ` +
    `OUT_OF_SCOPE ${counts.OUT_OF_SCOPE}, APPROVED ${counts.APPROVED}) | excluded: ${counts.excluded}`
);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(errors.length ? `\n${errors.length} error(s).` : "\nNo errors.");
process.exitCode = errors.length ? 1 : 0;
}
