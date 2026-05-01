import type { RequestHandler } from "express";
import { AppError } from "../error.js";
import { TokenService } from "../services/token.service.js";

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
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
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

    next();
  } catch (error) {
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
      return next(new AppError("No role found in token", 403));
    }

    if (!allowedRoles.includes(locals.role)) {
      return next(
        new AppError(
          `Missing required role: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
    }

    next();
  };
};
