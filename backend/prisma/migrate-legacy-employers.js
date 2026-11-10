// Backfill step of the expand → backfill → switch → contract migration.
// Moves every legacy SavedEmployer (employerId set, programId null) onto a
// Program, so users keep their tracked listings, statuses and action items.
//
//   node prisma/migrate-legacy-employers.js           # dry run (default)
//   node prisma/migrate-legacy-employers.js --apply
//
// Run AFTER `import-programs.js --apply`, because two legacy rows map onto
// imported programs. Idempotent: re-running finds nothing left to move.
//
// Mapping (user decisions 2026-11-08, see PROJECT_HANDOFF.md):
//   Amazon (careers hub)   → amazon-technical-apprenticeship (imported)
//   Microsoft (MSSA)       → microsoft-mssa (imported)
//   Oracle (OVIP)          → oracle-ovip: legacy DRAFT built from the seed row —
//                            still NEEDS_RESEARCH, so hidden until verified,
//                            imported and approved; savers see "Under review"
//   Hiring Our Heroes CFP  → hoh-corporate-fellowship: ARCHIVED with reason
//   VetsinTech (org row)   → vetsintech-organization-listing: ARCHIVED with reason

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { contentHashFor } from "./lib/programContent.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const staging = JSON.parse(fs.readFileSync(path.resolve(here, "../../research/programs-staging.json"), "utf8"));

// User-facing archive reasons were drafted in the staging file's seed recheck.
const archiveReasonFor = (seedName) => {
  const reason = staging.existingSeedRecheck.find((s) => s.seedName === seedName)?.archiveReason;
  if (!reason) throw new Error(`No archiveReason for seed "${seedName}" in staging`);
  return reason;
};

// The original seed's "URLs verified" date (prisma/seed.js comment).
const LEGACY_VERIFIED_ON = new Date("2026-08-09");

// Legacy rows that don't exist in the import and must be built from the
// old Employer data. `org` is the Organization they belong under.
const LEGACY_PROGRAMS = {
  Oracle: {
    slug: "oracle-ovip",
    org: { slug: "oracle", name: "Oracle", websiteUrl: "https://www.oracle.com/careers/life-at-oracle/veterans/" },
    format: "INTERNSHIP",
    publishStatus: "DRAFT",
    veteranAccessRoute: "Under re-verification: whether already-separated veterans can apply is not yet confirmed on Oracle's official page.",
  },
  "Hiring Our Heroes": {
    slug: "hoh-corporate-fellowship",
    org: { slug: "hoh", name: "Hiring Our Heroes", websiteUrl: "https://www.hiringourheroes.org/" },
    format: "FELLOWSHIP",
    publishStatus: "ARCHIVED",
    veteranAccessRoute: "None: this fellowship is only open to active-duty members within 180 days of separation.",
  },
  VetsinTech: {
    slug: "vetsintech-organization-listing",
    org: { slug: "vetsintech", name: "VetsinTech", websiteUrl: "https://vetsintech.co/" },
    format: "TRAINING",
    publishStatus: "ARCHIVED",
    veteranAccessRoute: "See VetsinTech's individual programs once they are verified.",
  },
};

// Legacy rows whose saves move onto an already-imported program.
const MAPS_TO_IMPORTED = {
  Amazon: "amazon-technical-apprenticeship",
  Microsoft: "microsoft-mssa",
};

function legacyProgramData(employer, spec) {
  const content = {
    organizationSlug: spec.org.slug,
    name: employer.programName,
    description: employer.description,
    format: spec.format,
    techTracks: [],
    veteranAccessRoute: spec.veteranAccessRoute,
    eligibilityNotes: employer.eligibilityNotes,
    prerequisites: null,
    remoteAvailability: null,
    locations: employer.locations,
    cost: null,
    duration: null,
    applicationAvailability: "UNKNOWN",
    applicationTiming: employer.applicationWindow,
    applicationUrl: null,
    officialSourceUrl: employer.url,
    skillbridgeNote: null,
  };
  const { organizationSlug, ...fields } = content;
  return {
    ...fields,
    slug: spec.slug,
    verifiedOn: LEGACY_VERIFIED_ON,
    contentHash: contentHashFor(content),
    publishStatus: spec.publishStatus,
    // A legacy DRAFT is built from old seed data, not verified research.
    awaitingResearch: spec.publishStatus === "DRAFT",
    ...(spec.publishStatus === "ARCHIVED" && { archivedAt: new Date(), archiveReason: archiveReasonFor(employer.name) }),
  };
}

async function main() {
  const employers = await prisma.employer.findMany();
  const pending = await prisma.savedEmployer.findMany({ where: { programId: null, employerId: { not: null } } });

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"}: ${employers.length} legacy employers, ${pending.length} saves to move\n`);

  // Resolve every legacy employer to a target program slug (creating legacy
  // rows if needed), then move saves. One transaction: all or nothing.
  const run = async (tx) => {
    const targetByEmployerId = new Map();
    for (const e of employers) {
      if (MAPS_TO_IMPORTED[e.name]) {
        const slug = MAPS_TO_IMPORTED[e.name];
        const program = await tx.program.findUnique({ where: { slug } });
        if (!program) throw new Error(`${slug} not found. Run import-programs.js --apply first.`);
        targetByEmployerId.set(e.id, program);
        console.log(`MAP_TO_IMPORTED      ${e.name} → ${slug} (${program.publishStatus})`);
      } else if (LEGACY_PROGRAMS[e.name]) {
        const spec = LEGACY_PROGRAMS[e.name];
        let program = await tx.program.findUnique({ where: { slug: spec.slug } });
        if (program) {
          console.log(`LEGACY_EXISTS        ${e.name} → ${spec.slug} (${program.publishStatus})`);
        } else {
          console.log(`CREATE_LEGACY_${spec.publishStatus.padEnd(9)} ${e.name} → ${spec.slug}`);
          if (APPLY) {
            const org = await tx.organization.upsert({ where: { slug: spec.org.slug }, update: {}, create: spec.org });
            program = await tx.program.create({ data: { ...legacyProgramData(e, spec), organizationId: org.id } });
          } else {
            program = { id: `(new:${spec.slug})`, slug: spec.slug };
          }
        }
        targetByEmployerId.set(e.id, program);
      } else {
        throw new Error(`Unmapped legacy employer "${e.name}". Add it to the mapping before migrating.`);
      }
    }

    let moved = 0;
    for (const save of pending) {
      const target = targetByEmployerId.get(save.employerId);
      // A user can track a program only once. If they already track the
      // target (e.g. saved it after the switch), keep both rows and report:
      // merging two sets of status/action items is a judgment call.
      const clash = await tx.savedEmployer.findFirst({ where: { userId: save.userId, programId: target.id } });
      if (clash) {
        console.log(`CONFLICT             save ${save.id}: user already tracks ${target.slug}; left on legacy employer`);
        continue;
      }
      if (APPLY) await tx.savedEmployer.update({ where: { id: save.id }, data: { programId: target.id } });
      moved++;
    }
    console.log(`\n${APPLY ? "Moved" : "Would move"} ${moved} of ${pending.length} saves.`);
  };

  if (APPLY) await prisma.$transaction(run);
  else await run(prisma); // dry run: read-only path, no writes are issued
  if (!APPLY) console.log("Dry run only. Re-run with --apply.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
