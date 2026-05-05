import type { ErrorRequestHandler } from "express";
import { AppError } from "../error.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    logger.warn("Handled application error", {
      statusCode: err.statusCode,
      message: err.message,
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  logger.error("Unhandled server error", err);

  return res.status(500).json({
    success: false,
    message,
  });
};
