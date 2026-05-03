import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

let prisma: PrismaClient | null = null;

export function initializeDb(): void {
  if (!env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Database-backed routes will return 503 until it is configured.");
    return;
  }
}

export function getDb(): PrismaClient | null {
  if (!env.DATABASE_URL) {
    return null;
  }
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export async function closeDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
