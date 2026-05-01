import { closeDb, initializeDb } from "./config/db.js";
import { startServer } from "./server.js";

async function bootstrap(): Promise<void> {
  await initializeDb();
  const server = startServer();

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Shutting down user domain service...`);

    server.close(async () => {
      try {
        await closeDb();
        console.log("Server and DB connections closed.");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap user domain service:", error);
  process.exit(1);
});
