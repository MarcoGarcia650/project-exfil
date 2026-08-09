import { PrismaClient } from "../generated/prisma/index.js";

// Single shared instance — avoids exhausting DB connections by creating
// a new PrismaClient per request/import.
export const prisma = new PrismaClient();
