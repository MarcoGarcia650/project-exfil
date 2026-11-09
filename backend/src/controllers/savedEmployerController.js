import { prisma } from "../lib/prisma.js";
import { actionItemTemplates } from "../lib/actionItemTemplates.js";

// Note on naming: the table is still `SavedEmployer` (renamed at the
// contract step); each row now tracks one Program.

// POST /saved-employers
// Auth required. Body: { programId, notes? }
export async function createSavedEmployer(req, res) {
  const { programId, notes } = req.body;
  const userId = req.user.userId;

  if (typeof programId !== "string" || !programId) {
    return res.status(400).json({ error: "programId is required" });
  }

  const program = await prisma.program.findUnique({ where: { id: programId } });
  // Only live listings can be newly saved. Drafts are invisible (same 404 as
  // missing); archived listings stay on existing dashboards but can't be added.
  if (!program || program.publishStatus === "DRAFT") {
    return res.status(404).json({ error: "Program not found" });
  }
  if (program.publishStatus === "ARCHIVED") {
    return res.status(409).json({ error: "This listing is archived and can't be saved" });
  }

  const defaultTitles = actionItemTemplates[program.format] ?? [];

  try {
    const savedEmployer = await prisma.savedEmployer.create({
      data: {
        userId,
        programId,
        notes,
        status: "RESEARCHING",
        actionItems: {
          create: defaultTitles.map((title, index) => ({ title, order: index })),
        },
      },
      include: { actionItems: true },
    });

    res.status(201).json(savedEmployer);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "You've already saved this program" });
    }
    throw err;
  }
}

const STATUSES = ["RESEARCHING", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"];

// PATCH /saved-employers/:id
// Auth required. Body: { status }
export async function updateSavedEmployerStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const savedEmployer = await prisma.savedEmployer.findUnique({ where: { id } });

  // 404 (not 403) whether the row doesn't exist OR belongs to someone else —
  // a 403 would confirm that a SavedEmployer with that id exists.
  if (!savedEmployer || savedEmployer.userId !== userId) {
    return res.status(404).json({ error: "Saved program not found" });
  }

  const updated = await prisma.savedEmployer.update({
    where: { id },
    data: { status },
  });

  res.json(updated);
}
