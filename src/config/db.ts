import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let prisma: PrismaClient | null = null;

export function initializeDb(): void {
  logger.info("Initializing database layer", {
    hasDatabaseUrl: Boolean(env.DATABASE_URL),
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
  });

  if (!env.DATABASE_URL) {
    logger.warn("DATABASE_URL is not set. Database-backed routes will return 503 until configured.");
    return;
  }

  logger.debug("Database configuration detected", {
    databaseUrlPresent: true,
  });
}

export function getDb(): PrismaClient | null {
  if (!env.DATABASE_URL) {
    logger.warn("Database client requested without DATABASE_URL");
    return null;
  }
  if (!prisma) {
    logger.info("Creating Prisma client instance");
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
    logger.debug("Prisma client created successfully");
  }
  return prisma;
}

export async function closeDb(): Promise<void> {
  if (prisma) {
    logger.info("Disconnecting Prisma client");
    await prisma.$disconnect();
    prisma = null;
    logger.info("Prisma client disconnected");
  }
}
