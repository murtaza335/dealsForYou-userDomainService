import type { ErrorRequestHandler } from "express";
import { AppError } from "../error.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  return res.status(500).json({
    success: false,
    message,
  });
};
