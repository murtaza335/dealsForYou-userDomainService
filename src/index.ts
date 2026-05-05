import { closeDb, initializeDb } from "./config/db.js";
import { startServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function bootstrap(): Promise<void> {
  logger.info("Bootstrapping user domain service", {
    service: "user-domain-service",
  });

  await initializeDb();
  const server = startServer();

  const shutdown = (signal: string) => {
    logger.info("Shutdown signal received", { signal });

    server.close(async () => {
      try {
        logger.info("HTTP server closed, disconnecting database");
        await closeDb();
        logger.info("User domain service shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", error);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  logger.error("Failed to bootstrap user domain service", error);
  process.exit(1);
});
