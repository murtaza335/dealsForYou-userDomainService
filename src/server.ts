import type { Server } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

export function startServer(): Server {
  const server = app.listen(env.PORT, () => {
    logger.info("HTTP server started", {
      service: env.SERVICE_NAME,
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });

  server.on("error", (error) => {
    logger.error("HTTP server encountered an error", error);
  });

  return server;
}
