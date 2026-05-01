import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../error.js";
import { logger } from "../utils/logger.js";
import type { UserEntity } from "../types/user.type.js";

export interface InternalTokenPayload extends JwtPayload {
  sub: string; // internal user id
  clerk_id: string; // clerk user id
  role: string;
  tenant?: string;
  email: string;
  iss: string;
  iat: number;
  // exp: number;
}

export interface TokenResponse {
  user: {
    id: string;
    clerkUserId: string;
    role: string;
    tenantId: string | null;
    email: string;
  };
  token: string;
  expiresAt: number;
  expiresIn: number;
}

export class TokenService {
  /**
   * Generate an internal JWT token for a user
   * @param user The user entity
   * @returns Token response with token and metadata
   */
  static generateToken(user: UserEntity): TokenResponse {
    if (!env.JWT_SECRET) {
      logger.error("JWT_SECRET not configured");
      throw new AppError("JWT_SECRET not configured", 500);
    }

    const now = Math.floor(Date.now() / 1000);
    const expirySeconds = env.TOKEN_EXPIRY_MINUTES * 60;
    const expiresAt = now + expirySeconds;

    const payload: InternalTokenPayload = {
      sub: user.id,
      clerk_id: user.clerkUserId,
      role: user.role,
      tenant: user.tenantId || undefined,
      email: user.email,
      iss: env.SERVICE_NAME,
      iat: now,
      // exp: expiresAt,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: `${env.TOKEN_EXPIRY_MINUTES}m`,
    });

    logger.info("Internal token generated", {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      role: user.role,
      expiresIn: env.TOKEN_EXPIRY_MINUTES,
    });

    return {
      user: {
        id: user.id,
        clerkUserId: user.clerkUserId,
        role: user.role,
        tenantId: user.tenantId,
        email: user.email,
      },
      token,
      expiresAt,
      expiresIn: expirySeconds,
    };
  }

  /**
   * Verify and decode an internal JWT token
   * @param token The JWT token
   * @returns The decoded payload
   */
  static verifyToken(token: string): InternalTokenPayload {
    try {
      if (!env.JWT_SECRET) {
        logger.error("JWT_SECRET not configured");
        throw new AppError("JWT_SECRET not configured", 500);
      }

      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as InternalTokenPayload;

      logger.debug("Internal token verified", { userId: decoded.sub });
      return decoded;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        logger.warn("Internal token expired");
        throw new AppError("Internal token expired", 401);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid internal token", { error: error.message });
        throw new AppError(`Invalid internal token: ${error.message}`, 401);
      }

      logger.error("Failed to verify internal token", error);
      throw new AppError("Failed to verify internal token", 401);
    }
  }

  /**
   * Extract bearer token from Authorization header
   * @param authHeader The Authorization header value
   * @returns The token without "Bearer " prefix
   */
  static extractToken(authHeader: string | undefined): string {
    if (!authHeader) {
      logger.debug("Missing Authorization header");
      throw new AppError("Missing Authorization header", 401);
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn("Invalid Authorization header format");
      throw new AppError("Invalid Authorization header format", 401);
    }

    return parts[1];
  }
}
