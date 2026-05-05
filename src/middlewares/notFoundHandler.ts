import type { RequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  logger.warn("Route not found", {
    method: _req.method,
    path: _req.originalUrl,
  });

  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};
