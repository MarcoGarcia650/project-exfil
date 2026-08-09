import { prisma } from "../src/lib/prisma.js";

// Real veteran hiring programs — URLs verified 2026-08-09. Re-verify
// periodically; program pages move and this is the app's core value.
const employers = [
  {
    name: "Amazon",
    programName: "Amazon Military Careers",
    programType: "INTERNSHIP_PIPELINE",
    url: "https://www.amazon.jobs/military",
    description:
      "Amazon's dedicated recruiting pipeline for transitioning veterans, military spouses, and active-duty service members, connecting military experience to roles across tech, logistics, and operations.",
    eligibilityNotes:
      "Veterans, ex-service members, military spouses, guardsmen, reservists, and active-duty members planning their transition.",
    industryTags: ["tech", "cloud", "logistics"],
    locations: ["Remote", "Multiple US locations"],
    applicationWindow: "Rolling",
  },
  {
    name: "Oracle",
    programName: "Oracle Veteran Internship Program (OVIP)",
    programType: "INTERNSHIP_PIPELINE",
    url: "https://www.oracle.com/careers/life-at-oracle/veterans/",
    description:
      "A 12-week internship for veterans, reservists/guardsmen, and active-duty military spouses across business areas including technology, data, logistics, HR, and sales. Accepts ~40 participants per cohort, twice a year.",
    eligibilityNotes:
      "Transitioning veterans, reservists, guardsmen, and active-duty military spouses; no prior enrollment requirement.",
    industryTags: ["tech", "cloud"],
    locations: ["Multiple US locations"],
    applicationWindow: "Cohorts run twice a year",
  },
  {
    name: "Microsoft",
    programName: "Microsoft Software & Systems Academy (MSSA)",
    programType: "FELLOWSHIP",
    url: "https://military.microsoft.com/mssa/",
    description:
      "A full-time, 17-week technical training program (an approved DoD SkillBridge program) preparing transitioning service members and veterans for careers in cloud development, cloud administration, and cybersecurity operations.",
    eligibilityNotes: "Active-duty service members (via DoD SkillBridge) and veterans.",
    industryTags: ["tech", "cloud", "cybersecurity"],
    locations: ["Remote", "Multiple US locations"],
    applicationWindow: "Rolling cohorts",
  },
  {
    name: "Hiring Our Heroes",
    programName: "Corporate Fellowship Program",
    programType: "FELLOWSHIP",
    url: "https://www.hiringourheroes.org/career-services/fellowships/internships/cfp/",
    description:
      "A 12-week DoD SkillBridge fellowship placing transitioning service members and military spouses in professional roles with host companies, combined with weekly classroom training in corporate skills and certifications.",
    eligibilityNotes:
      "Active-duty service members transitioning within 6 months of the program start, and military spouses of active-duty service members.",
    industryTags: ["general", "multi-industry"],
    locations: ["Multiple US locations"],
    applicationWindow: "Rolling cohorts",
  },
  {
    name: "VetsinTech",
    programName: "VetsinTech",
    programType: "OTHER",
    url: "https://vetsintech.co/",
    description:
      "A nonprofit network and resource organization supporting veterans and military spouses with technology education, career services, and entrepreneurship programs across chapters nationwide.",
    eligibilityNotes: "Open to veterans and military spouses.",
    industryTags: ["tech"],
    locations: ["Remote", "Multiple US chapters"],
    applicationWindow: null,
  },
];

async function main() {
  // upsert (not create) keyed on the @unique `name` field, so re-running
  // this script updates existing rows instead of erroring on duplicates.
  for (const employer of employers) {
    await prisma.employer.upsert({
      where: { name: employer.name },
      update: employer,
      create: employer,
    });
  }
  console.log(`Seeded ${employers.length} employers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
