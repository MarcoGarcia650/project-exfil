import { prisma } from "../lib/prisma.js";
import { isPublicStatus } from "../lib/publishStatus.js";

// What a user sees about each saved listing, by its current status:
//   PUBLISHED → the listing summary
//   ARCHIVED  → the summary plus "Archived" and the reason (user decision)
//   DRAFT     → name, organization and "Under review" only — draft content
//   REJECTED  → name and organization only (failed review; never shown)
//               is never shown, even to someone who saved it earlier
function dashboardView(program) {
  const base = {
    id: program.id,
    slug: program.slug,
    name: program.name,
    publishStatus: program.publishStatus,
    organization: program.organization,
  };
  if (!isPublicStatus(program.publishStatus)) return base;
  return {
    ...base,
    format: program.format,
    applicationAvailability: program.applicationAvailability,
    officialSourceUrl: program.officialSourceUrl,
    verifiedOn: program.verifiedOn,
    archivedAt: program.archivedAt,
    archiveReason: program.archiveReason,
  };
}

// GET /dashboard
// Auth required.
export async function getDashboard(req, res) {
  const userId = req.user.userId;

  const rows = await prisma.savedEmployer.findMany({
    where: { userId },
    include: {
      program: { include: { organization: { select: { slug: true, name: true } } } },
      actionItems: { orderBy: { order: "asc" } },
    },
    orderBy: { savedAt: "desc" },
  });

  const savedPrograms = rows.map(({ program, ...saved }) => ({
    ...saved,
    program: dashboardView(program),
  }));

  const totalActionItems = savedPrograms.reduce((sum, sp) => sum + sp.actionItems.length, 0);
  const completedActionItems = savedPrograms.reduce(
    (sum, sp) => sum + sp.actionItems.filter((item) => item.completed).length,
    0
  );

  res.json({
    savedPrograms,
    summary: {
      totalSaved: savedPrograms.length,
      totalActionItems,
      completedActionItems,
    },
  });
}
