// A small fixed dataset that every suite can rely on, independent of the
// research staging file. Slugs mirror real listings so tests read naturally.
//
//   vetswhocode-accelerator   PUBLISHED (ACCEPTING, SOFTWARE_DEV, TRAINING)
//   microsoft-mssa            DRAFT
//   fortinet-veterans         DRAFT  (the only program of org "fortinet")
//   amazon-technical-…        DRAFT  (the only program of org "amazon")
//   oracle-ovip               DRAFT, awaitingResearch
//   hoh-corporate-fellowship  ARCHIVED with a reason (only program of "hoh")
//
//   legacy@example.com / legacy-pass-1  — no username (pre-username account)

import bcrypt from "bcrypt";

export const LEGACY_USER = { email: "legacy@example.com", password: "legacy-pass-1" };

const ORGS = [
  ["vetswhocode", "Vets Who Code", "https://vetswhocode.io"],
  ["microsoft", "Microsoft", "https://military.microsoft.com"],
  ["fortinet", "Fortinet", "https://www.fortinet.com"],
  ["amazon", "Amazon", "https://www.amazon.jobs"],
  ["oracle", "Oracle", "https://www.oracle.com"],
  ["hoh", "Hiring Our Heroes", "https://www.hiringourheroes.org"],
];

const base = (slug, name, org, extra = {}) => ({
  slug,
  name,
  org,
  description: `${name} — fixture description.`,
  format: "TRAINING",
  techTracks: ["SOFTWARE_DEV"],
  veteranAccessRoute: "Veterans apply directly (fixture).",
  officialSourceUrl: `https://example.org/${slug}`,
  verifiedOn: new Date("2026-11-08T00:00:00Z"),
  contentHash: `fixture-${slug}`,
  ...extra,
});

const PROGRAMS = [
  base("vetswhocode-accelerator", "Vets Who Code Software Engineering Accelerator", "vetswhocode", {
    publishStatus: "PUBLISHED", applicationAvailability: "ACCEPTING", applicationUrl: "https://example.org/apply",
  }),
  base("microsoft-mssa", "Microsoft Software & Systems Academy", "microsoft"),
  base("fortinet-veterans", "Fortinet Veterans Program", "fortinet", { techTracks: ["CYBERSECURITY"] }),
  base("amazon-technical-apprenticeship", "Amazon Technical Apprenticeships", "amazon", { format: "APPRENTICESHIP", techTracks: ["CLOUD"] }),
  base("oracle-ovip", "Oracle Veteran Internship Program (OVIP)", "oracle", { format: "INTERNSHIP", awaitingResearch: true }),
  base("hoh-corporate-fellowship", "Corporate Fellowship Program", "hoh", {
    format: "FELLOWSHIP", techTracks: [], publishStatus: "ARCHIVED", archivedAt: new Date("2026-11-08T00:00:00Z"),
    archiveReason: "Archived Nov 2026: this fellowship is only open to active-duty members (fixture).",
  }),
];

export async function loadFixtures(prisma) {
  const orgIds = {};
  for (const [slug, name, websiteUrl] of ORGS) {
    orgIds[slug] = (await prisma.organization.create({ data: { slug, name, websiteUrl } })).id;
  }
  for (const { org, ...p } of PROGRAMS) {
    await prisma.program.create({ data: { ...p, organizationId: orgIds[org] } });
  }
  await prisma.user.create({
    data: { email: LEGACY_USER.email, passwordHash: await bcrypt.hash(LEGACY_USER.password, 4), branch: "ARMY" },
  });
}
