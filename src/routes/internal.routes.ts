import { Router } from "express";
import {
  resolveUser,
  getUserById,
  verifyToken,
  updateUserRole,
} from "../controllers/internal.controller.js";
import { verifyInternalToken, requireRole } from "../middlewares/internalAuth.js";
import { logger } from "../utils/logger.js";

export const internalRouter = Router();

logger.debug("Registering internal routes");

/**
 * POST /internal/resolve-user
 * Public endpoint (protected only by Clerk JWT verification)
 * Returns internal token after verifying Clerk JWT
 */
internalRouter.post("/resolve-user", resolveUser);

/**
 * POST /internal/verify-token
 * Verify an internal token (for debugging)
 */
internalRouter.post("/verify-token", verifyToken);

/**
 * GET /internal/user/:userId
 * Get user by ID (requires internal token)
 */
internalRouter.get("/user/:userId", verifyInternalToken, getUserById);

/**
 * PATCH /internal/user/:userId/role
 * Update user role (requires internal token with APP_ADMIN role)
 */
internalRouter.patch(
  "/user/:userId/role",
  verifyInternalToken,
  requireRole("APP_ADMIN"),
  updateUserRole,
);
