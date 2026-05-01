import { describe, it, expect, beforeAll } from "vitest";
import { TokenService } from "../services/token.service.js";
import type { UserEntity } from "../types/user.type.js";

describe("TokenService", () => {
  let testUser: UserEntity;

  beforeAll(() => {
    testUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      clerkUserId: "user_test_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "END_USER",
      tenantId: "tenant_123",
      isActive: true,
      brandId: "brand_123",
      metadata: { customField: "value" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe("generateToken", () => {
    it("should generate a valid token with correct claims", () => {
      const response = TokenService.generateToken(testUser);

      expect(response).toBeDefined();
      expect(response.token).toBeTruthy();
      expect(response.expiresIn).toBe(15 * 60); // default 15 minutes
      expect(response.user).toEqual({
        id: testUser.id,
        clerkUserId: testUser.clerkUserId,
        role: testUser.role,
        tenantId: testUser.tenantId,
        email: testUser.email,
      });
    });

    it("should include expiration timestamp", () => {
      const before = Math.floor(Date.now() / 1000);
      const response = TokenService.generateToken(testUser);
      const after = Math.floor(Date.now() / 1000);

      expect(response.expiresAt).toBeGreaterThanOrEqual(before + 15 * 60);
      expect(response.expiresAt).toBeLessThanOrEqual(after + 15 * 60);
    });
  });

  describe("verifyToken", () => {
    it("should verify and decode a valid token", () => {
      const { token } = TokenService.generateToken(testUser);
      const payload = TokenService.verifyToken(token);

      expect(payload.sub).toBe(testUser.id);
      expect(payload.clerk_id).toBe(testUser.clerkUserId);
      expect(payload.role).toBe(testUser.role);
      expect(payload.email).toBe(testUser.email);
      expect(payload.tenant).toBe(testUser.tenantId);
    });

    it("should throw error for invalid token", () => {
      expect(() => {
        TokenService.verifyToken("invalid.token.here");
      }).toThrow();
    });

    it("should throw error for expired token", () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTAwMDAwMDAwMH0.invalid";

      expect(() => {
        TokenService.verifyToken(expiredToken);
      }).toThrow();
    });
  });

  describe("extractToken", () => {
    it("should extract token from valid Authorization header", () => {
      const token = "test-token-value";
      const header = `Bearer ${token}`;
      const extracted = TokenService.extractToken(header);
      expect(extracted).toBe(token);
    });

    it("should throw error for missing Authorization header", () => {
      expect(() => {
        TokenService.extractToken(undefined);
      }).toThrow();
    });

    it("should throw error for invalid header format", () => {
      expect(() => {
        TokenService.extractToken("InvalidFormat token");
      }).toThrow();

      expect(() => {
        TokenService.extractToken("Bearer");
      }).toThrow();
    });
  });

  describe("Token payload structure", () => {
    it("should include all required JWT claims", () => {
      const { token } = TokenService.generateToken(testUser);
      const payload = TokenService.verifyToken(token);

      // Standard JWT claims
      expect(payload.iss).toBe("user-domain-service");
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(typeof payload.iat).toBe("number");
      expect(typeof payload.exp).toBe("number");

      // Custom claims
      expect(payload.sub).toBe(testUser.id);
      expect(payload.clerk_id).toBe(testUser.clerkUserId);
      expect(payload.role).toBe(testUser.role);
      expect(payload.email).toBe(testUser.email);
    });

    it("should handle users without tenant_id", () => {
      const userWithoutTenant = {
        ...testUser,
        tenantId: null,
      };

      const response = TokenService.generateToken(userWithoutTenant);
      const payload = TokenService.verifyToken(response.token);

      expect(payload.tenant).toBeUndefined();
      expect(response.user.tenantId).toBeNull();
    });
  });
});
