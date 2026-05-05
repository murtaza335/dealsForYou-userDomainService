import type { RequestHandler } from "express";
import { AppError } from "../error.js";
import { TokenService } from "../services/token.service.js";
import { logger } from "../utils/logger.js";

export interface InternalAuthLocals {
  internalUserId?: string;
  clerkUserId?: string;
  role?: string;
  tenantId?: string;
  email?: string;
}

/**
 * Middleware to verify internal JWT token from Authorization header
 * Used by other services to validate requests from API gateway
 */
export const verifyInternalToken: RequestHandler = (req, res, next) => {
  try {
    logger.debug("Verifying internal authorization token", {
      path: req.path,
      method: req.method,
    });

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn("Missing Authorization header on internal request", {
        path: req.path,
        method: req.method,
      });
      return next(new AppError("Missing Authorization header", 401));
    }

    const token = TokenService.extractToken(authHeader);
    const payload = TokenService.verifyToken(token);

    const locals = res.locals as InternalAuthLocals;
    locals.internalUserId = payload.sub;
    locals.clerkUserId = payload.clerk_id;
    locals.role = payload.role;
    locals.tenantId = payload.tenant;
    locals.email = payload.email;

    logger.debug("Internal token verified successfully", {
      internalUserId: payload.sub,
      role: payload.role,
      tenantId: payload.tenant,
    });

    next();
  } catch (error) {
    logger.error("Internal token verification failed", error);
    next(error);
  }
};

/**
 * Middleware to require specific roles for an endpoint
 * Must be used after verifyInternalToken middleware
 */
export const requireRole = (...allowedRoles: string[]): RequestHandler => {
  return (_req, res, next) => {
    const locals = res.locals as InternalAuthLocals;

    if (!locals.role) {
      logger.warn("Internal authorization denied: role missing");
      return next(new AppError("No role found in token", 403));
    }

    if (!allowedRoles.includes(locals.role)) {
      logger.warn("Internal authorization denied: role not allowed", {
        role: locals.role,
        allowedRoles,
      });
      return next(
        new AppError(
          `Missing required role: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
    }

    logger.debug("Internal role authorization granted", { role: locals.role, allowedRoles });
    next();
  };
};
