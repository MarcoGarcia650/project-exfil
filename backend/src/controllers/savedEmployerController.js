import { prisma } from "../lib/prisma.js";
import { actionItemTemplates } from "../lib/actionItemTemplates.js";

// POST /saved-employers
// Auth required. Body: { employerId, notes? }
export async function createSavedEmployer(req, res) {
  const { employerId, notes } = req.body;
  const userId = req.user.userId;

  const employer = await prisma.employer.findUnique({ where: { id: employerId } });
  if (!employer) {
    return res.status(404).json({ error: "Employer not found" });
  }

  const defaultTitles = actionItemTemplates[employer.programType] ?? [];

  try {
    const savedEmployer = await prisma.savedEmployer.create({
      data: {
        userId,
        employerId,
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
      return res.status(409).json({ error: "You've already saved this employer" });
    }
    throw err;
  }
}

// PATCH /saved-employers/:id
// Auth required. Body: { status }
export async function updateSavedEmployerStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  const savedEmployer = await prisma.savedEmployer.findUnique({ where: { id } });

  // 404 (not 403) whether the row doesn't exist OR belongs to someone else —
  // same idea as login's uniform error message. A 403 would confirm to an
  // attacker that a SavedEmployer with that id exists, just not theirs.
  if (!savedEmployer || savedEmployer.userId !== userId) {
    return res.status(404).json({ error: "Saved employer not found" });
  }

  const updated = await prisma.savedEmployer.update({
    where: { id },
    data: { status },
  });

  res.json(updated);
}
