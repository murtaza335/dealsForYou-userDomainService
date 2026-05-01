import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { AppError } from "../error.js";
import { USER_ROLES, type UserRole } from "../types/role.type.js";
import { logger } from "../utils/logger.js";

type AuthLocals = {
  authUserId?: string;
  role?: UserRole;
};

const claimToRole = (claim: unknown): UserRole => {
  const value = String(claim || USER_ROLES.END_USER).toUpperCase();
  if (value === USER_ROLES.BRAND_ADMIN) return USER_ROLES.BRAND_ADMIN;
  if (value === USER_ROLES.APP_ADMIN) return USER_ROLES.APP_ADMIN;
  return USER_ROLES.END_USER;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
  console.log(auth)

  logger.debug("Authenticating request", {
    path: req.path,
    method: req.method,
    hasUserId: Boolean(auth.userId),
  });

  if (!auth.userId) {
    logger.warn("Unauthorized request: missing Clerk userId", {
      path: req.path,
      method: req.method,
    });
    return next(new AppError("Unauthorized", 401));
  }

  const sessionClaims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
  const metadata = (sessionClaims.metadata ?? {}) as Record<string, unknown>;
  const roleClaim = metadata.role ?? sessionClaims.role;

  const locals = res.locals as AuthLocals;
  locals.authUserId = auth.userId;
  locals.role = claimToRole(roleClaim);

  logger.debug("Authenticated request", {
    authUserId: auth.userId,
    role: locals.role,
    path: req.path,
    method: req.method,
  });
  next();
};

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (_req, res, next) => {
    const locals = res.locals as AuthLocals;

    if (!locals.role) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!roles.includes(locals.role)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
};
