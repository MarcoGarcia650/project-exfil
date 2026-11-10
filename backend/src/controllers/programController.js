import { prisma } from "../lib/prisma.js";
import { isPublicStatus } from "../lib/publishStatus.js";

const TECH_TRACKS = ["SOFTWARE_DEV", "IT_SUPPORT", "CLOUD", "CYBERSECURITY", "DATA"];
const FORMATS = ["TRAINING", "CERTIFICATION_TRAINING", "FELLOWSHIP", "INTERNSHIP", "APPRENTICESHIP", "DIRECT_HIRE"];
const AVAILABILITY = ["ACCEPTING", "ROLLING", "CLOSED", "UNKNOWN"];

// Fields safe to show publicly. Review metadata (reviewer, hashes) and
// archive internals stay server-side.
export const PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  format: true,
  techTracks: true,
  veteranAccessRoute: true,
  eligibilityNotes: true,
  prerequisites: true,
  remoteAvailability: true,
  locations: true,
  cost: true,
  duration: true,
  applicationAvailability: true,
  applicationTiming: true,
  applicationUrl: true,
  officialSourceUrl: true,
  skillbridgeNote: true,
  verifiedOn: true,
  publishStatus: true,
  archivedAt: true,
  archiveReason: true,
  organization: { select: { slug: true, name: true, websiteUrl: true } },
};

// GET /programs?q=cloud&techTrack=CLOUD,DATA&format=TRAINING&availability=ACCEPTING,ROLLING
// Public. Browse shows PUBLISHED only: DRAFTs are never public, and
// ARCHIVED listings are reachable by URL but hidden from browse.
// Unknown filter values are ignored rather than erroring, so a stale
// shared link still shows results.
// "CLOUD,DATA" → ["CLOUD","DATA"]; unknown values are dropped so stale
// shared links still work.
function parseList(value, allowed) {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").map((v) => v.trim()).filter((v) => allowed.includes(v)))];
}

// Keyword search: case-insensitive match on program name, organization name
// or description. Capped length; blank means no search.
const SEARCH_MAX = 100;

export async function listPrograms(req, res) {
  const { techTrack, format, availability } = req.query;
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, SEARCH_MAX) : "";
  // Each filter takes one value or a comma-separated list (any-of).
  const tracks = parseList(techTrack, TECH_TRACKS);
  const formats = parseList(format, FORMATS);
  const availabilities = parseList(availability, AVAILABILITY);

  const programs = await prisma.program.findMany({
    where: {
      publishStatus: "PUBLISHED",
      ...(tracks.length && { techTracks: { hasSome: tracks } }),
      ...(formats.length && { format: { in: formats } }),
      ...(availabilities.length && { applicationAvailability: { in: availabilities } }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { organization: { name: { contains: q, mode: "insensitive" } } },
        ],
      }),
    },
    select: PUBLIC_SELECT,
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });

  res.json(programs);
}

// GET /programs/:slug — public. PUBLISHED and ARCHIVED are viewable;
// DRAFT and REJECTED return the same 404 as a missing slug, so they don't leak.
export async function getProgram(req, res) {
  const program = await prisma.program.findUnique({
    where: { slug: req.params.slug },
    select: PUBLIC_SELECT,
  });

  if (!program || !isPublicStatus(program.publishStatus)) {
    return res.status(404).json({ error: "Program not found" });
  }
  res.json(program);
}
