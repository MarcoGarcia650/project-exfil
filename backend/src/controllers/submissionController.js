import { prisma } from "../lib/prisma.js";
import { isPublicStatus } from "../lib/publishStatus.js";
import { checkPostingLimit } from "../lib/postingLimit.js";
import { parseSubmissionBody, parseSourceUrl } from "../lib/communityRules.js";

const KINDS = ["LISTING_UPDATE", "NEW_LISTING_LEAD"];

// POST /submissions — auth + active account.
// Body: { kind, programSlug?, body, sourceUrl? }
// A submission never changes a listing. The admin reviews it; any change
// goes through staging → validator → import like all listing data.
// No username needed: submissions are private to the admin.
export async function createSubmission(req, res) {
  const { kind, programSlug } = req.body ?? {};
  if (!KINDS.includes(kind)) return res.status(400).json({ error: "Choose what you're submitting" });

  const body = parseSubmissionBody(req.body?.body);
  if (body.error) return res.status(400).json({ error: body.error });
  const sourceUrl = parseSourceUrl(req.body?.sourceUrl);
  if (sourceUrl.error) return res.status(400).json({ error: sourceUrl.error });

  let programId = null;
  if (kind === "LISTING_UPDATE") {
    const program = programSlug
      ? await prisma.program.findUnique({ where: { slug: String(programSlug) }, select: { id: true, publishStatus: true } })
      : null;
    if (!program || !isPublicStatus(program.publishStatus)) {
      return res.status(400).json({ error: "A listing update needs a listing to update" });
    }
    programId = program.id;
  } else if (programSlug) {
    return res.status(400).json({ error: "A new program suggestion isn't tied to an existing listing" });
  }

  const limited = await checkPostingLimit(prisma.submission, "submitterId", req.user.userId, "submission");
  if (limited) return res.status(429).json({ error: limited });

  const submission = await prisma.submission.create({
    data: { kind, programId, submitterId: req.user.userId, body: body.value, sourceUrl: sourceUrl.value },
    select: { id: true, status: true, createdAt: true },
  });
  res.status(201).json(submission);
}

// GET /submissions/mine — auth. The user's own submissions with status
// and any admin note (the note is written to be shown to the submitter).
export async function listMySubmissions(req, res) {
  const rows = await prisma.submission.findMany({
    where: { submitterId: req.user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, kind: true, body: true, sourceUrl: true, status: true,
      adminNote: true, createdAt: true, reviewedAt: true,
      program: { select: { slug: true, name: true, publishStatus: true } },
    },
  });
  // A listing that is no longer public keeps its name but loses its link.
  res.json(
    rows.map(({ program, ...s }) => ({
      ...s,
      program: program && { name: program.name, slug: isPublicStatus(program.publishStatus) ? program.slug : null },
    }))
  );
}
