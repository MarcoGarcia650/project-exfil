import { prisma } from "../lib/prisma.js";

// PATCH /action-items/:id
// Auth required. Body: { completed }
export async function updateActionItem(req, res) {
  const { id } = req.params;
  const { completed } = req.body;
  const userId = req.user.userId;

  // ActionItem doesn't have a userId of its own — ownership is one hop
  // away, through its SavedEmployer — so we pull that in to check it.
  const actionItem = await prisma.actionItem.findUnique({
    where: { id },
    include: { savedEmployer: true },
  });

  if (!actionItem || actionItem.savedEmployer.userId !== userId) {
    return res.status(404).json({ error: "Action item not found" });
  }

  const updated = await prisma.actionItem.update({
    where: { id },
    data: { completed },
  });

  res.json(updated);
}
