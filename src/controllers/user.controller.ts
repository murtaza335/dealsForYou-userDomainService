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
    const raw =
      (req.headers["user-id"] as string | undefined) ??
      (typeof res.locals.authUserId === "string" ? res.locals.authUserId : undefined);
    const authUserId = raw?.trim() ?? "";
    if (!authUserId) throw new AppError("Unauthorized", 401);

    const service = getService();
    const user = await service.findByClerkUserId(authUserId);

    if (!user) {
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
        }
      } catch (error) {
        console.warn("Failed to fetch linked brand:", error);
      }
    }

    return res.status(200).json({
      success: true,
      data: { ...user, brand },
    });
  } catch (error) {
    next(error);
  }
};

export const onboardConsumer: RequestHandler = async (req, res, next) => {
  try {
    const payload = onboardConsumerSchema.parse(req.body);
    const service = getService();
    const user = await service.onboardConsumer(payload);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const onboardBrandAdmin: RequestHandler = async (req, res, next) => {
  try {
    const payload = onboardBrandAdminSchema.parse(req.body);

    if (payload.brand.scrapeRequested && !payload.brand.website) {
      throw new AppError("Website URL is required when scraper is requested.", 400);
    }

    const service = getService();
    const user = await service.onboardBrandAdmin(payload);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe: RequestHandler = async (req, res, next) => {
  try {
    const raw =
      (req.headers["user-id"] as string | undefined) ??
      (typeof res.locals.authUserId === "string" ? res.locals.authUserId : undefined);
    const authUserId = raw?.trim() ?? "";
    if (!authUserId) throw new AppError("Unauthorized", 401);

    const payload = updateMyProfileSchema.parse(req.body);
    const service = getService();
    const updated = await service.updateMyProfile(authUserId, payload);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
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
    const service = getService();
    const users = await service.listAllUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const listAdminUsers: RequestHandler = async (req, res, next) => {
  try {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const service = getService();
    const users = role && roleValues.includes(role as UserRole)
      ? await service.listUsersByRole(role as UserRole)
      : await service.listAllUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const suspendAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) throw new AppError("User ID is required", 400);

    const service = getService();
    const user = await service.updateUserStatus(userId, false);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) throw new AppError("User ID is required", 400);

    const service = getService();
    const user = await service.deleteUser(userId);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
