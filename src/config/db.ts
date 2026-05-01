import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

export function initializeDb(): void {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Database-backed routes will be unavailable.");
    return;
  }
}

export function getDb() {
  return prisma;
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}
