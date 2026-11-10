import { prisma } from "../lib/prisma.js";
import { PUBLIC_SELECT } from "./programController.js";
import { PUBLIC_STATUSES } from "../lib/publishStatus.js";

// GET /organizations/:slug — public.
// Lists the organization's PUBLISHED programs, plus its ARCHIVED ones
// separately (archived listings are public at their URL, so naming them
// here leaks nothing). DRAFT programs never appear. An organization with
// nothing public returns 404, so a drafts-only org isn't revealed.
export async function getOrganization(req, res) {
  const org = await prisma.organization.findUnique({
    where: { slug: req.params.slug },
    select: {
      slug: true,
      name: true,
      websiteUrl: true,
      programs: {
        where: { publishStatus: { in: PUBLIC_STATUSES } },
        select: PUBLIC_SELECT,
        orderBy: { name: "asc" },
      },
    },
  });

  if (!org || org.programs.length === 0) {
    return res.status(404).json({ error: "Organization not found" });
  }

  const { programs, ...rest } = org;
  res.json({
    ...rest,
    programs: programs.filter((p) => p.publishStatus === "PUBLISHED"),
    archivedPrograms: programs.filter((p) => p.publishStatus === "ARCHIVED"),
  });
}
