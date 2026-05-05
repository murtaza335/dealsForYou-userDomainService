import type { RequestHandler } from "express";
import { AppError } from "../error.js";
import {
  onboardBrandAdminSchema,
  onboardConsumerSchema,
  updateMyProfileSchema,
  upsertUserSchema,
} from "../models/user.model.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserService } from "../services/user.service.js";
import { getDb } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { roleValues, type UserRole } from "../types/role.type.js";

const getService = (): UserService => {
  const db = getDb();
  if (!db) {
    throw new AppError("Database not configured. Set DATABASE_URL and restart service.", 503);
  }

  return new UserService(new UserRepository(db));
};

export const getMe: RequestHandler = async (req, res, next) => {
  try {
    logger.debug("Fetching current user profile", {
      path: req.originalUrl,
    });

    const raw =
      (req.headers["user-id"] as string | undefined) ??
      (typeof res.locals.authUserId === "string" ? res.locals.authUserId : undefined);
    const authUserId = raw?.trim() ?? "";
    if (!authUserId) {
      logger.warn("Unauthorized profile lookup attempt", {
        path: req.originalUrl,
      });
      throw new AppError("Unauthorized", 401);
    }

    const service = getService();
    const user = await service.findByClerkUserId(authUserId);

    if (!user) {
      logger.warn("Current user not found in domain database", { authUserId });
      return res.status(404).json({
        success: false,
        message: "User not found in domain DB",
      });
    }

    let brand: unknown = null;
    if (user.brandId) {
      try {
        const response = await fetch(
          `${env.DEALS_SERVICE_URL.replace(/\/$/, "")}/api/brands/by-brand-id/${encodeURIComponent(user.brandId)}`
        );
        if (response.ok) {
          const payload = (await response.json()) as { data?: unknown };
          brand = payload.data ?? null;
        } else {
          logger.warn("Linked brand lookup returned a non-success response", {
            authUserId,
            brandId: user.brandId,
            status: response.status,
          });
        }
      } catch (error) {
        logger.warn("Failed to fetch linked brand", {
          authUserId,
          brandId: user.brandId,
          error,
        });
      }
    }

    logger.info("Current user profile fetched successfully", {
      authUserId,
      userId: user.id,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      data: { ...user, brand },
    });
  } catch (error) {
    logger.error("Failed to fetch current user profile", error);
    next(error);
  }
};

export const onboardConsumer: RequestHandler = async (req, res, next) => {
  try {
    logger.info("Consumer onboarding request received", {
      email: req.body?.email,
      clerkUserId: req.body?.clerkUserId,
    });

    const payload = onboardConsumerSchema.parse(req.body);
    const service = getService();
    const user = await service.onboardConsumer(payload);

    logger.info("Consumer onboarded successfully", {
      clerkUserId: payload.clerkUserId,
      userId: user.id,
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Consumer onboarding failed", error);
    next(error);
  }
};

export const onboardBrandAdmin: RequestHandler = async (req, res, next) => {
  try {
    logger.info("Brand admin onboarding request received", {
      email: req.body?.email,
      clerkUserId: req.body?.clerkUserId,
    });

    const payload = onboardBrandAdminSchema.parse(req.body);

    if (payload.brand.scrapeRequested && !payload.brand.website) {
      logger.warn("Brand admin onboarding rejected due to missing website for scraper request", {
        clerkUserId: payload.clerkUserId,
      });
      throw new AppError("Website URL is required when scraper is requested.", 400);
    }

    const service = getService();
    const user = await service.onboardBrandAdmin(payload);

    logger.info("Brand admin onboarded successfully", {
      clerkUserId: payload.clerkUserId,
      userId: user.id,
      brandId: user.brandId,
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Brand admin onboarding failed", error);
    next(error);
  }
};

export const updateMe: RequestHandler = async (req, res, next) => {
  try {
    logger.debug("Profile update request received", {
      path: req.originalUrl,
    });

    const raw =
      (req.headers["user-id"] as string | undefined) ??
      (typeof res.locals.authUserId === "string" ? res.locals.authUserId : undefined);
    const authUserId = raw?.trim() ?? "";
    if (!authUserId) {
      logger.warn("Unauthorized profile update attempt", { path: req.originalUrl });
      throw new AppError("Unauthorized", 401);
    }

    const payload = updateMyProfileSchema.parse(req.body);
    const service = getService();
    const updated = await service.updateMyProfile(authUserId, payload);

    logger.info("Profile updated successfully", {
      authUserId,
      userId: updated.id,
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error("Failed to update profile", error);
    next(error);
  }
};

export const upsertFromClerk: RequestHandler = async (req, res, next) => {
  try {
    logger.info("Received upsert-from-clerk request", {
      clerkUserId: req.body?.clerkUserId,
      email: req.body?.email,
    });

    const payload = upsertUserSchema.parse(req.body);
    const service = getService();
    const user = await service.upsertUser(payload);

    logger.info("Successfully upserted user from Clerk", {
      clerkUserId: payload.clerkUserId,
      email: payload.email,
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Failed to upsert user from Clerk", error);
    next(error);
  }
};

export const listUsers: RequestHandler = async (_req, res, next) => {
  try {
    logger.debug("Listing users requested");

    const service = getService();
    const users = await service.listAllUsers();

    logger.info("Users listed successfully", {
      count: users.length,
    });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("Failed to list users", error);
    next(error);
  }
};

export const listAdminUsers: RequestHandler = async (req, res, next) => {
  try {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    logger.debug("Admin user listing requested", { role });

    const service = getService();
    const users = role && roleValues.includes(role as UserRole)
      ? await service.listUsersByRole(role as UserRole)
      : await service.listAllUsers();

    logger.info("Admin user listing completed", {
      role: role ?? "ALL",
      count: users.length,
    });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("Failed to list admin users", error);
    next(error);
  }
};

export const suspendAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) {
      logger.warn("Suspend user request missing userId");
      throw new AppError("User ID is required", 400);
    }

    logger.info("Suspending user", { userId });

    const service = getService();
    const user = await service.updateUserStatus(userId, false);

    logger.info("User suspended successfully", { userId, isActive: user.isActive });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Failed to suspend user", error);
    next(error);
  }
};

export const deleteAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) {
      logger.warn("Delete user request missing userId");
      throw new AppError("User ID is required", 400);
    }

    logger.info("Deleting user", { userId });

    const service = getService();
    const user = await service.deleteUser(userId);

    logger.info("User deleted successfully", { userId });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Failed to delete user", error);
    next(error);
  }
};
