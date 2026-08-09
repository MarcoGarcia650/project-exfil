import { prisma } from "../lib/prisma.js";

// GET /employers?industryTag=tech&programType=INTERNSHIP_PIPELINE&location=Remote
export async function listEmployers(req, res) {
  const { industryTag, programType, location } = req.query;

  const employers = await prisma.employer.findMany({
    where: {
      ...(industryTag && { industryTags: { has: industryTag } }),
      ...(programType && { programType }),
      ...(location && { locations: { has: location } }),
    },
    orderBy: { name: "asc" },
  });

  res.json(employers);
}
