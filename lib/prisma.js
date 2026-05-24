// Prisma client singleton
// Prevents multiple PrismaClient instances from being created during Next.js hot reloads in development.
// In production, a single instance is created and reused for the lifetime of the process.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Reuse the existing instance if it was already attached to globalThis, otherwise create a new one
const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Only cache the instance on the global object in development to avoid exhausting DB connections
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
