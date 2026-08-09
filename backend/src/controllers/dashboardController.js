import { prisma } from "../lib/prisma.js";

// GET /dashboard
// Auth required.
export async function getDashboard(req, res) {
  const userId = req.user.userId;

  const savedEmployers = await prisma.savedEmployer.findMany({
    where: { userId },
    include: { employer: true, actionItems: true },
    orderBy: { savedAt: "desc" },
  });

  const totalActionItems = savedEmployers.reduce((sum, se) => sum + se.actionItems.length, 0);
  const completedActionItems = savedEmployers.reduce(
    (sum, se) => sum + se.actionItems.filter((item) => item.completed).length,
    0
  );

  res.json({
    savedEmployers,
    summary: {
      totalSaved: savedEmployers.length,
      totalActionItems,
      completedActionItems,
    },
  });
}
