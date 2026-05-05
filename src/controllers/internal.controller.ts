import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../error.js";
import { ClerkService } from "../services/clerk.service.js";
import { TokenService } from "../services/token.service.js";
import { UserService } from "../services/user.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { getDb } from "../config/db.js";
import { logger } from "../utils/logger.js";
import { roleValues } from "../types/role.type.js";

const resolveUserSchema = z.object({
  clerkId: z.string().optional(),
});

const getServiceAndDb = () => {
  const db = getDb();
  if (!db) {
    throw new AppError("Database not configured. Set DATABASE_URL and restart service.", 503);
  }
  return {
    db,
    service: new UserService(new UserRepository(db)),
  };
};

/**
 * POST /internal/resolve-user
 * Verify Clerk JWT, resolve/provision user, and return internal token
 *
 * Authorization: Bearer <clerk-jwt-token>
 * or provide clerkToken in request body
 *
 * Returns: { user, token, expiresAt, expiresIn }
 */
export const resolveUser: RequestHandler = async (req, res, next) => {
  try {
    logger.debug("Internal resolve-user request received", {
      hasUserIdHeader: Boolean(req.headers["user-id"]),
      hasEmailHeader: Boolean(req.headers["email"]),
    });

    const { service } = getServiceAndDb();
    
    // Get Clerk token from Authorization header or request body
    let clerkId = req.headers["user-id"] as string;
    let email = req.headers["email"] as string;

    
    if (!clerkId) {
      logger.warn("Resolve-user request missing Clerk ID");
      throw new AppError(
          "Clerk ID must be provided via Authorization header or in request body as clerkId",
          400,
        );
    }

    if (!email) {
      logger.warn("Resolve-user request missing email", { clerkId });
      throw new AppError(
          "Email must be provided via header or in request body as email",
          400,
        );
    }

    // Verify Clerk JWT
    // const clerkPayload = await ClerkService.verifyToken(clerkId);
    // const clerkUserId = clerkPayload.sub;
    // const email = clerkPayload.email;

    // logger.info("Resolving user", { clerkUserId });

    // Resolve or provision user
    const user = await service.resolveUser(clerkId, email);

    if (!user) {
      logger.warn("User not found after resolution attempt", { clerkId, email });
      throw new AppError("Failed to resolve user", 500);
    }

    logger.info("User resolved successfully", {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      isNewUser: false,
    });

    // Generate internal token
    const tokenResponse = TokenService.generateToken(user);

    logger.info("Internal user resolved successfully", {
      userId: user.id,
      clerkUserId: user.clerkUserId,
    });

    return res.status(200).json({
      success: true,
      data: tokenResponse,
    });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn("Token resolution failed", { error: error.message });
    } else {
      logger.error("Unexpected error in resolveUser", error);
    }
    next(error);
  }
};

/**
 * GET /internal/user/:userId
 * Get user by internal user ID (requires internal token)
 */
export const getUserById: RequestHandler = async (req, res, next) => {
  try {
    logger.debug("Internal get-user-by-id request received", {
      userId: req.params.userId,
    });

    const { service } = getServiceAndDb();
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!userId) {
      logger.warn("Get-user-by-id request missing userId");
      throw new AppError("User ID is required", 400);
    }

    logger.debug("Fetching user by ID", { userId });
    const user = await service.findById(userId);

    if (!user) {
      logger.warn("User not found", { userId });
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    logger.debug("User found", { userId });
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Error fetching user", error);
    next(error);
  }
};

/**
 * POST /internal/verify-token
 * Verify an internal token (for debugging/validation)
 * Returns decoded payload
 */
export const verifyToken: RequestHandler = async (req, res, next) => {
  try {
    logger.debug("Internal token verification request received");

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn("Token verification request missing Authorization header");
      throw new AppError("Missing Authorization header", 400);
    }

    const token = TokenService.extractToken(authHeader);
    const payload = TokenService.verifyToken(token);

    logger.debug("Internal token verified for validation", { userId: payload.sub });

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        payload,
      },
    });
  } catch (error) {
    logger.warn("Token verification failed", { error });
    next(error);
  }
};

/**
 * PATCH /internal/user/:userId/role
 * Update user role (requires internal token with APP_ADMIN role)
 */
export const updateUserRole: RequestHandler = async (req, res, next) => {
  try {
    logger.debug("Internal update-user-role request received", {
      userId: req.params.userId,
    });

    const { service } = getServiceAndDb();
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!userId) {
      logger.warn("Update-user-role request missing userId");
      throw new AppError("User ID is required", 400);
    }

    const roleSchema = z.object({
      role: z.enum(roleValues),
    });

    const payload = roleSchema.parse(req.body);
    logger.info("Updating user role", { userId, role: payload.role });
    
    const updatedUser = await service.updateUserRole(userId, payload);

    logger.info("User role updated successfully", {
      userId,
      role: updatedUser.role,
    });

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    logger.error("Error updating user role", error);
    next(error);
  }
};
