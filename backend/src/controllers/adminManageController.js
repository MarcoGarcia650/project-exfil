import { prisma } from "../lib/prisma.js";
import { str, httpsUrl } from "../lib/listingInput.js";

// Admin management of live listings and organizations, used from the
// browse pages (listing popup, listing page, organization page) and the
// admin page's Removed tab. Every handler runs behind requireAuth +
// requireAdmin (adminRoutes.js).
//
// Listing states these handlers move between:
//   PUBLISHED ── archive ──▶ ARCHIVED ── unarchive ──▶ PUBLISHED (or DRAFT if
//                                                      content changed since review)
//   PUBLISHED / ARCHIVED ── remove ──▶ REMOVED ── restore ──▶ the state it had
//                                                      (PUBLISHED falls back to DRAFT if
//                                                      edited while removed)
//   any state ── delete permanently ──▶ gone, only when nobody saved it,
//                                       discussed it, or suggested a change to it
// The importer never revives, updates or unpublishes a REMOVED listing.

const ARCHIVE_REASON_MAX = 500;

// Users' data that keeps a listing from being permanently deleted.
async function listingUsage(id, db = prisma) {
  const [saves, comments, submissions] = await Promise.all([
    db.savedEmployer.count({ where: { programId: id } }),
    db.comment.count({ where: { programId: id } }),
    db.submission.count({ where: { programId: id } }),
  ]);
  return { saves, comments, submissions };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function usageBlockers({ saves, comments, submissions }) {
  return [
    saves && `${plural(saves, "user has", "users have")} saved it`,
    comments && `it has ${plural(comments, "discussion post", "discussion posts")}`,
    submissions && `it has ${plural(submissions, "user suggestion", "user suggestions")}`,
  ].filter(Boolean);
}

async function loadProgram(id) {
  return prisma.program.findUnique({
    where: { id },
    select: {
      id: true, slug: true, publishStatus: true, contentHash: true, reviewedContentHash: true,
      removedFromStatus: true, organization: { select: { slug: true } },
    },
  });
}

const notFound = (res) => res.status(404).json({ error: "Program not found" });
const wrongState = (res, status, action) =>
  res.status(409).json({ error: `Can't ${action} a listing that is ${status.toLowerCase()}. Reload and try again.` });

// GET /admin/listings/:id/usage — what's attached to a listing, so the UI
// can say up front whether "Delete permanently" is possible.
export async function getListingUsage(req, res) {
  const program = await loadProgram(req.params.id);
  if (!program) return notFound(res);
  const usage = await listingUsage(program.id);
  res.json({ ...usage, canDelete: usageBlockers(usage).length === 0 });
}

// POST /admin/listings/:id/archive — Body: { reason } (public).
// Only a PUBLISHED listing: archiving a draft would make unreviewed
// content public at its URL.
export async function archiveListing(req, res) {
  const reason = str(req.body?.reason, ARCHIVE_REASON_MAX, "Reason", { required: true });
  if (reason.error) return res.status(400).json({ error: reason.error });
  const { count } = await prisma.program.updateMany({
    where: { id: req.params.id, publishStatus: "PUBLISHED" },
    data: { publishStatus: "ARCHIVED", archivedAt: new Date(), archiveReason: reason.value },
  });
  if (count === 1) return res.json({ ok: true, publishStatus: "ARCHIVED" });
  const program = await loadProgram(req.params.id);
  return program ? wrongState(res, program.publishStatus, "archive") : notFound(res);
}

// POST /admin/listings/:id/unarchive — back into browse. If its content
// changed since it was last reviewed, it goes to Drafts to review instead.
export async function unarchiveListing(req, res) {
  const program = await loadProgram(req.params.id);
  if (!program) return notFound(res);
  if (program.publishStatus !== "ARCHIVED") return wrongState(res, program.publishStatus, "unarchive");
  const publishStatus = program.reviewedContentHash === program.contentHash ? "PUBLISHED" : "DRAFT";
  const { count } = await prisma.program.updateMany({
    where: { id: program.id, publishStatus: "ARCHIVED", contentHash: program.contentHash },
    data: { publishStatus, archivedAt: null, archiveReason: null },
  });
  if (count !== 1) return res.status(409).json({ error: "This listing changed since you loaded it. Reload and try again." });
  res.json({ ok: true, publishStatus });
}

// POST /admin/listings/:id/remove — hide a public listing everywhere.
// Users who saved it keep their row; their dashboard says it's unavailable.
export async function removeListing(req, res) {
  const program = await loadProgram(req.params.id);
  if (!program) return notFound(res);
  if (!["PUBLISHED", "ARCHIVED"].includes(program.publishStatus)) {
    return wrongState(res, program.publishStatus, "remove");
  }
  const { count } = await prisma.program.updateMany({
    where: { id: program.id, publishStatus: program.publishStatus },
    data: { publishStatus: "REMOVED", removedAt: new Date(), removedFromStatus: program.publishStatus },
  });
  if (count !== 1) return res.status(409).json({ error: "This listing changed since you loaded it. Reload and try again." });
  res.json({ ok: true, publishStatus: "REMOVED" });
}

// POST /admin/removed/:id/restore — put it back the way it was. A listing
// that was PUBLISHED but edited while removed goes to Drafts to review.
export async function restoreRemoved(req, res) {
  const program = await loadProgram(req.params.id);
  if (!program) return notFound(res);
  if (program.publishStatus !== "REMOVED") return wrongState(res, program.publishStatus, "restore");
  let publishStatus = program.removedFromStatus ?? "DRAFT";
  if (publishStatus === "PUBLISHED" && program.reviewedContentHash !== program.contentHash) publishStatus = "DRAFT";
  const { count } = await prisma.program.updateMany({
    where: { id: program.id, publishStatus: "REMOVED", contentHash: program.contentHash },
    data: { publishStatus, removedAt: null, removedFromStatus: null },
  });
  if (count !== 1) return res.status(409).json({ error: "This listing changed since you loaded it. Reload and try again." });
  res.json({ ok: true, publishStatus });
}

// GET /admin/removed — removed listings, most recently removed first.
export async function listRemoved(req, res) {
  const rows = await prisma.program.findMany({
    where: { publishStatus: "REMOVED" },
    orderBy: { removedAt: "desc" },
    select: {
      id: true, slug: true, name: true, removedAt: true, removedFromStatus: true,
      organization: { select: { name: true, slug: true } },
      _count: { select: { savedBy: true, comments: true, submissions: true } },
    },
  });
  res.json(
    rows.map(({ _count, ...r }) => {
      const usage = { saves: _count.savedBy, comments: _count.comments, submissions: _count.submissions };
      return { ...r, usage, canDelete: usageBlockers(usage).length === 0 };
    })
  );
}

// DELETE /admin/listings/:id — permanent. Refused while any user data
// hangs off the listing (remove it instead). If the listing is still in
// the research staging file, the next import brings it back as a draft.
export async function deleteListing(req, res) {
  const result = await prisma.$transaction(async (tx) => {
    const program = await tx.program.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!program) return { status: 404, body: { error: "Program not found" } };
    const blockers = usageBlockers(await listingUsage(program.id, tx));
    if (blockers.length) {
      return {
        status: 409,
        body: { error: `Can't delete permanently: ${blockers.join(", ")}. Remove it instead (it can be restored later).` },
      };
    }
    await tx.program.delete({ where: { id: program.id } });
    return { status: 200, body: { ok: true } };
  });
  res.status(result.status).json(result.body);
}

// ---------- Organizations ----------

// GET /admin/organizations/:slug — the organization plus what it holds,
// even when nothing about it is public (its public page 404s then).
export async function getOrganizationAdmin(req, res) {
  const org = await prisma.organization.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, slug: true, name: true, websiteUrl: true, editedInAppAt: true },
  });
  if (!org) return res.status(404).json({ error: "Organization not found" });
  const [byStatus, comments] = await Promise.all([
    prisma.program.groupBy({ by: ["publishStatus"], where: { organizationId: org.id }, _count: true }),
    prisma.comment.count({ where: { organizationId: org.id } }),
  ]);
  const listings = Object.fromEntries(byStatus.map((g) => [g.publishStatus, g._count]));
  const totalListings = byStatus.reduce((n, g) => n + g._count, 0);
  res.json({ ...org, listings, totalListings, comments, canDelete: totalListings === 0 && comments === 0 });
}

// PUT /admin/organizations/:id — Body: { name, websiteUrl }. The slug (URL)
// stays fixed. Marks the organization as edited so imports keep these.
export async function updateOrganization(req, res) {
  const name = str(req.body?.name, 120, "Organization name", { required: true });
  if (name.error) return res.status(400).json({ error: name.error });
  const website = httpsUrl(req.body?.websiteUrl, "Website");
  if (website.error) return res.status(400).json({ error: website.error });
  const exists = await prisma.organization.count({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ error: "Organization not found" });
  const org = await prisma.organization.update({
    where: { id: req.params.id },
    data: { name: name.value, websiteUrl: website.value, editedInAppAt: new Date() },
    select: { id: true, slug: true, name: true, websiteUrl: true },
  });
  res.json(org);
}

// DELETE /admin/organizations/:id — only when it has no listings (in any
// state, including drafts and removed ones) and no discussion posts.
export async function deleteOrganization(req, res) {
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!org) return { status: 404, body: { error: "Organization not found" } };
    const [listings, comments] = await Promise.all([
      tx.program.count({ where: { organizationId: org.id } }),
      tx.comment.count({ where: { organizationId: org.id } }),
    ]);
    const blockers = [
      listings && `it has ${plural(listings, "listing", "listings")} (including drafts and removed ones)`,
      comments && `it has ${plural(comments, "discussion post", "discussion posts")}`,
    ].filter(Boolean);
    if (blockers.length) {
      return { status: 409, body: { error: `Can't delete: ${blockers.join(" and ")}. Delete those first.` } };
    }
    await tx.organization.delete({ where: { id: org.id } });
    return { status: 200, body: { ok: true } };
  });
  res.status(result.status).json(result.body);
}
