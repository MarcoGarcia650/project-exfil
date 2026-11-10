// Import reviewed-research programs from the staging file into the DB.
//
//   node prisma/import-programs.js            # dry run (default): prints what WOULD happen
//   node prisma/import-programs.js --apply    # performs exactly what the dry run prints
//   node prisma/import-programs.js --file=path/to/staging.json
//   node prisma/import-programs.js --apply --overwrite-app-edits   # staging wins over admin-page edits
//
// This script is the ONLY way listing content gets written. It never
// publishes anything — new listings arrive as DRAFT and only the admin
// page's "Approve & publish" makes them public. Rules (research/
// IMPORT_AND_MAINTENANCE_PLAN.md → "Import state transitions"):
//
//   new SOURCE_VERIFIED record          → create DRAFT
//   content unchanged                   → keep state (bump verifiedOn if newer)
//   content changed, DRAFT              → update, stays DRAFT
//   content changed, PUBLISHED          → update, back to DRAFT, review cleared
//   content changed, ARCHIVED           → update, stays ARCHIVED (never republished)
//   archiveReason set in staging        → ARCHIVED (with archivedAt + reason)
//   restore: true in staging, ARCHIVED  → DRAFT, archive + review cleared
//   REJECTED, content unchanged         → stays REJECTED (the fix hasn't landed)
//   REJECTED, content changed           → DRAFT for re-review, rejection cleared
//   NEEDS_RESEARCH record already in DB → flagged only, never changed
//   edited in the admin page, content differs → skipped and reported
//                                         (--overwrite-app-edits: staging wins
//                                          and the in-app edit flag is cleared)
//
// Nothing is ever deleted.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { validateStaging } from "../../research/scripts/validate-staging.mjs";
import { contentHashFor } from "./lib/programContent.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const OVERWRITE_APP_EDITS = args.includes("--overwrite-app-edits");
const file =
  args.find((a) => a.startsWith("--file="))?.split("=")[1] ??
  path.resolve(here, "../../research/programs-staging.json");

// Staging uses the literal "unknown" for "no official source stated it".
// The DB uses null, which the UI renders as "Not stated by provider".
const orNull = (v) => (v === undefined || v === null || v === "" || v === "unknown" ? null : v);
const orgSlugFrom = (orgId) => orgId.replace(/^org-/, "");

// A short, factual note — SkillBridge is secondary under the current scope.
function skillbridgeNoteFor(rec) {
  return rec.skillbridge?.status === "PROVIDER_STATED" || rec.skillbridge?.status === "DIRECTORY_CONFIRMED"
    ? "The provider also offers a DoD SkillBridge route for active-duty members. Veterans use the route described above."
    : null;
}

// Staging record → the content fields stored on Program.
function contentFrom(rec) {
  return {
    organizationSlug: orgSlugFrom(rec.organizationId),
    name: rec.programName,
    description: rec.description,
    format: rec.programFormat,
    techTracks: rec.techTracks.filter((t) => t !== "unknown"),
    veteranAccessRoute: rec.veteranAccess.route,
    eligibilityNotes: orNull(rec.eligibilityNotes),
    prerequisites: orNull(rec.prerequisites),
    remoteAvailability: orNull(rec.location?.remoteAvailability),
    locations: rec.location?.locations ?? [],
    cost: orNull(rec.cost),
    duration: orNull(rec.duration),
    applicationAvailability: rec.applicationStatus,
    applicationTiming: orNull(rec.applicationTiming),
    applicationUrl: orNull(rec.applicationUrl),
    officialSourceUrl: rec.officialSourceUrl,
    skillbridgeNote: skillbridgeNoteFor(rec),
  };
}

const CLEARED_REVIEW = { reviewedById: null, reviewedAt: null, reviewedContentHash: null };
const CLEARED_REJECTION = { rejectedAt: null, rejectionReason: null };

// Decide what to do with one SOURCE_VERIFIED staging record, given the
// current DB row (or null). Returns { action, data } — pure, no DB access.
export function planFor(rec, existing, { overwriteAppEdits = false } = {}) {
  const content = contentFrom(rec);
  const contentHash = contentHashFor(content);
  const verifiedOn = new Date(rec.verifiedOn);
  const { organizationSlug, ...fields } = content; // organization is connected separately
  // awaitingResearch: false — every write here is SOURCE_VERIFIED content.
  // editedInAppAt: null — once staging content is written, staging owns it.
  const base = { ...fields, contentHash, verifiedOn, awaitingResearch: false, editedInAppAt: null };

  if (!existing) {
    if (rec.archiveReason) {
      return { action: "CREATE_ARCHIVED", data: { ...base, publishStatus: "ARCHIVED", archivedAt: new Date(), archiveReason: rec.archiveReason } };
    }
    return { action: "CREATE_DRAFT", data: { ...base, publishStatus: "DRAFT" } };
  }

  // A row still awaiting research (legacy backfill) counts as changed, so
  // verified content always replaces it and clears the flag.
  const changed = existing.contentHash !== contentHash || existing.awaitingResearch === true;

  // Edited in the admin page: the app copy wins over staging, so a stale
  // research file can't silently undo an admin's fix (or unpublish it).
  if (existing.editedInAppAt && changed && !overwriteAppEdits) {
    return { action: "SKIP_EDITED_IN_APP", data: null };
  }
  const newerVerified = verifiedOn > existing.verifiedOn ? verifiedOn : existing.verifiedOn;

  // A rejected draft only comes back once its content actually changes;
  // it never goes straight to ARCHIVED (that would make unreviewed content
  // public at its URL).
  if (existing.publishStatus === "REJECTED") {
    if (changed) {
      return { action: "RESUBMIT_REJECTED", data: { ...base, verifiedOn: newerVerified, publishStatus: "DRAFT", ...CLEARED_REJECTION, ...CLEARED_REVIEW } };
    }
    return newerVerified > existing.verifiedOn
      ? { action: "BUMP_VERIFIED_ON", data: { verifiedOn: newerVerified } }
      : { action: "UNCHANGED", data: null };
  }
  if (rec.restore && existing.publishStatus === "ARCHIVED") {
    return { action: "RESTORE_TO_DRAFT", data: { ...base, verifiedOn: newerVerified, publishStatus: "DRAFT", archivedAt: null, archiveReason: null, ...CLEARED_REVIEW } };
  }
  if (rec.archiveReason && existing.publishStatus !== "ARCHIVED") {
    return { action: "ARCHIVE", data: { ...base, verifiedOn: newerVerified, publishStatus: "ARCHIVED", archivedAt: new Date(), archiveReason: rec.archiveReason } };
  }
  if (!changed) {
    return newerVerified > existing.verifiedOn
      ? { action: "BUMP_VERIFIED_ON", data: { verifiedOn: newerVerified } }
      : { action: "UNCHANGED", data: null };
  }
  switch (existing.publishStatus) {
    case "DRAFT":
      return { action: "UPDATE_DRAFT", data: { ...base, verifiedOn: newerVerified } };
    case "PUBLISHED":
      return { action: "UPDATE_AND_UNPUBLISH", data: { ...base, verifiedOn: newerVerified, publishStatus: "DRAFT", ...CLEARED_REVIEW } };
    case "ARCHIVED":
      return { action: "UPDATE_ARCHIVED", data: { ...base, verifiedOn: newerVerified } };
    default:
      throw new Error(`Unexpected publishStatus ${existing.publishStatus}`);
  }
}

async function main() {
  const staging = JSON.parse(fs.readFileSync(file, "utf8"));

  // 1. Gate: refuse to import anything if the staging file doesn't validate.
  const { errors, warnings } = validateStaging(staging);
  for (const w of warnings) console.log(`WARN  ${w}`);
  if (errors.length) {
    for (const e of errors) console.log(`ERROR ${e}`);
    console.error(`\nValidation failed (${errors.length} errors). Nothing imported.`);
    process.exitCode = 1;
    return;
  }

  const orgsById = new Map(staging.organizations.map((o) => [o.id, o]));
  const importable = staging.programs.filter((p) => p.reviewStatus === "SOURCE_VERIFIED");
  const notImportable = staging.programs.filter((p) => p.reviewStatus !== "SOURCE_VERIFIED");

  // 2. Plan every record against the current DB state.
  const existingRows = await prisma.program.findMany();
  const bySlug = new Map(existingRows.map((r) => [r.slug, r]));
  const plans = importable.map((rec) => ({
    rec,
    ...planFor(rec, bySlug.get(rec.id) ?? null, { overwriteAppEdits: OVERWRITE_APP_EDITS }),
  }));

  const flagged = notImportable.filter((p) => bySlug.has(p.id));
  const stagingSlugs = new Set(staging.programs.map((p) => p.id));
  const orphaned = existingRows.filter((r) => !stagingSlugs.has(r.slug));

  // 3. Report.
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${file}\n`);
  for (const p of plans) {
    const why = p.action === "SKIP_EDITED_IN_APP" ? " (edited in the admin page; staging differs — app copy kept. Update staging to match, or use --overwrite-app-edits)" : "";
    console.log(`${p.action.padEnd(22)} ${p.rec.id}${why}`);
  }
  for (const p of flagged) console.log(`${"FLAG_NOT_VERIFIED".padEnd(22)} ${p.id} (${p.reviewStatus} in staging, row exists in DB — left unchanged; admin decision)`);
  for (const r of orphaned) console.log(`${"NOT_IN_STAGING".padEnd(22)} ${r.slug} (${r.publishStatus}) — left unchanged`);
  const tally = plans.reduce((t, p) => ({ ...t, [p.action]: (t[p.action] ?? 0) + 1 }), {});
  console.log(`\nSummary: ${JSON.stringify(tally)}; skipped ${notImportable.length} non-SOURCE_VERIFIED records.`);

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to perform exactly these changes.");
    return;
  }

  // 4. Apply in one transaction — all or nothing.
  await prisma.$transaction(async (tx) => {
    for (const p of plans) {
      if (p.action === "UNCHANGED" || p.action === "SKIP_EDITED_IN_APP") continue;
      const org = orgsById.get(p.rec.organizationId);
      const orgSlug = orgSlugFrom(org.id);
      const organization = await tx.organization.upsert({
        where: { slug: orgSlug },
        update: { name: org.name, websiteUrl: orNull(org.website) },
        create: { slug: orgSlug, name: org.name, websiteUrl: orNull(org.website) },
      });
      if (p.action.startsWith("CREATE")) {
        await tx.program.create({ data: { ...p.data, slug: p.rec.id, organizationId: organization.id } });
      } else {
        const data = p.action === "BUMP_VERIFIED_ON" ? p.data : { ...p.data, organizationId: organization.id };
        await tx.program.update({ where: { slug: p.rec.id }, data });
      }
    }
  });
  console.log("\nApplied.");
}

// Run only when executed directly (lets tests import planFor()).
if (fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
