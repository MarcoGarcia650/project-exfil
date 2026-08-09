import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

// Prisma 7 requires an explicit driver adapter instead of reading
// DATABASE_URL implicitly.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Single shared instance — avoids exhausting DB connections by creating
// a new PrismaClient per request/import.
export const prisma = new PrismaClient({ adapter });
