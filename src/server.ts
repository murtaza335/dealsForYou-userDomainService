import type { Server } from "http";
import app from "./app.js";
import { env } from "./config/env.js";

export function startServer(): Server {
  const server = app.listen(env.PORT, () => {
    console.log(`user_domain_service listening on port ${env.PORT}`);
  });

  return server;
}
