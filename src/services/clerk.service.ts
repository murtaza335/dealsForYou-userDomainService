import jwt, { type JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { env } from "../config/env.js";
import { AppError } from "../error.js";
import { logger } from "../utils/logger.js";

export interface ClerkPayload extends JwtPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  metadata?: Record<string, unknown>;
}

let jwksClient: JwksClient | null = null;

const getJwksClient = (): JwksClient => {
  if (!jwksClient) {
    logger.debug("Initializing Clerk JWKS client", { jwksUrl: env.CLERK_JWKS_URL });
    jwksClient = new JwksClient({
      jwksUri: env.CLERK_JWKS_URL,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClient;
};

export class ClerkService {
  /**
   * Verify a Clerk JWT token and extract the clerk_user_id
   * @param token The bearer token (without "Bearer " prefix)
   * @returns The clerk_user_id (sub claim)
   */
  static async verifyToken(token: string): Promise<ClerkPayload> {
    try {
      logger.debug("Verifying Clerk token");

      // Decode header to get kid
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        logger.warn("Invalid token format received");
        throw new AppError("Invalid token format", 401);
      }

      const { header, payload } = decoded;
      const kid = (header as unknown as Record<string, string>).kid;

      if (!kid) {
        logger.warn("Token missing key ID");
        throw new AppError("Token missing key ID", 401);
      }

      // Get the signing key from JWKS
      const client = getJwksClient();
      const key = await client.getSigningKey(kid);
      const signingKey = key.getPublicKey();

      logger.debug("Retrieved Clerk signing key", { kid });

      // Verify the token
      const verified = jwt.verify(token, signingKey, {
        algorithms: ["RS256"],
      }) as ClerkPayload;

      if (!verified.sub) {
        logger.warn("Token missing subject (sub) claim");
        throw new AppError("Token missing subject (sub) claim", 401);
      }

      logger.debug("Clerk JWT verified successfully", { clerkUserId: verified.sub });
      return verified;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        logger.warn("Expired Clerk token");
        throw new AppError("Token expired", 401);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid Clerk token", { error: error.message });
        throw new AppError(`Invalid token: ${error.message}`, 401);
      }

      logger.error("Failed to verify Clerk token", error);
      throw new AppError("Failed to verify token", 401);
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

    logger.debug("Authorization bearer token extracted for Clerk verification");

    return parts[1];
  }
}
