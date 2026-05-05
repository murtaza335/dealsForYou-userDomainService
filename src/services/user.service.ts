import { AppError } from "../error.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { UpdateMyProfilePayload, UpsertUserPayload, UserEntity, UpdateUserRolePayload } from "../types/user.type.js";
import { USER_ROLES } from "../types/role.type.js";
import type { UserRole } from "../types/role.type.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

type ConsumerOnboardingPayload = {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  area?: string;
  foodPreferences?: string[];
};

type BrandAdminOnboardingPayload = {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  title: string;
  brand: Record<string, unknown>;
};

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findByClerkUserId(clerkUserId: string): Promise<UserEntity | null> {
    logger.debug("Service lookup by Clerk user ID", { clerkUserId });
    return this.userRepository.findByClerkUserId(clerkUserId);
  }

  findById(userId: string): Promise<UserEntity | null> {
    logger.debug("Service lookup by user ID", { userId });
    return this.userRepository.findById(userId);
  }

  listAllUsers(): Promise<UserEntity[]> {
    logger.debug("Service listing all users");
    return this.userRepository.listAll();
  }

  listUsersByRole(role: UserRole): Promise<UserEntity[]> {
    logger.debug("Service listing users by role", { role });
    return this.userRepository.listByRole(role);
  }

  upsertUser(payload: UpsertUserPayload): Promise<UserEntity> {
    logger.info("Service upserting user", {
      clerkUserId: payload.clerkUserId,
      email: payload.email,
      role: payload.role,
    });
    return this.userRepository.upsertUser(payload);
  }

  onboardConsumer(payload: ConsumerOnboardingPayload): Promise<UserEntity> {
    logger.info("Service onboarding consumer", {
      clerkUserId: payload.clerkUserId,
      email: payload.email,
    });

    return this.userRepository.upsertUser({
      clerkUserId: payload.clerkUserId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: USER_ROLES.END_USER,
      isActive: true,
      metadata: {
        phone: payload.phone ?? null,
        city: payload.city ?? null,
        area: payload.area ?? null,
        foodPreferences: payload.foodPreferences ?? [],
      },
    });
  }

  async onboardBrandAdmin(payload: BrandAdminOnboardingPayload): Promise<UserEntity> {
    logger.info("Service onboarding brand admin", {
      clerkUserId: payload.clerkUserId,
      email: payload.email,
      brandName: payload.brand.name,
    });

    const response = await fetch(`${env.DEALS_SERVICE_URL.replace(/\/$/, "")}/api/brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload.brand),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error("Brand onboarding API returned an error", {
        status: response.status,
        statusText: response.statusText,
        body: text,
      });
      throw new AppError(`Brand onboarding failed: ${text || response.statusText}`, 400);
    }

    const brandPayload = (await response.json()) as { data?: { brandId?: string; approvalStatus?: string } };
    const brandId = brandPayload.data?.brandId;
    if (!brandId) {
      logger.error("Brand onboarding response missing brandId", {
        clerkUserId: payload.clerkUserId,
        email: payload.email,
      });
      throw new AppError("Brand onboarding failed: missing brand id", 500);
    }

    logger.debug("Brand created successfully", {
      clerkUserId: payload.clerkUserId,
      brandId,
      approvalStatus: brandPayload.data?.approvalStatus,
    });

    return this.userRepository.upsertUser({
      clerkUserId: payload.clerkUserId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: USER_ROLES.BRAND_ADMIN,
      brandId,
      isActive: true,
      metadata: {
        phone: payload.phone,
        title: payload.title,
        approvalStatus: brandPayload.data?.approvalStatus ?? "PENDING",
      },
    });
  }

  async updateMyProfile(clerkUserId: string, payload: UpdateMyProfilePayload): Promise<UserEntity> {
    logger.info("Service updating my profile", { clerkUserId });
    const user = await this.userRepository.updateMyProfile(clerkUserId, payload);
    if (!user) {
      logger.warn("Update profile target user not found", { clerkUserId });
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async updateUserRole(userId: string, payload: UpdateUserRolePayload): Promise<UserEntity> {
    logger.info("Service updating user role", { userId, role: payload.role });
    const user = await this.userRepository.updateUserRole(userId, payload);
    if (!user) {
      logger.warn("Update role target user not found", { userId });
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserEntity> {
    logger.info("Service updating user status", { userId, isActive });
    const user = await this.userRepository.updateUserStatus(userId, isActive);
    if (!user) {
      logger.warn("Update status target user not found", { userId });
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async deleteUser(userId: string): Promise<UserEntity> {
    logger.info("Service deleting user", { userId });
    const user = await this.userRepository.deleteUser(userId);
    if (!user) {
      logger.warn("Delete target user not found", { userId });
      throw new AppError("User not found", 404);
    }
    return user;
  }

  /**
   * Resolve a user by clerk ID, auto-provisioning if not found
   * @param clerkUserId The Clerk user ID
   * @param email Optional email for auto-provisioning
   * @returns The resolved or created user
   */
  async resolveUser(clerkUserId: string, email?: string): Promise<UserEntity> {
    logger.info("Service resolving user", {
      clerkUserId,
      hasEmail: Boolean(email),
    });

    // Try to find existing user
    let user = await this.findByClerkUserId(clerkUserId);

    if (user) {
      logger.debug("Resolved existing user", { clerkUserId, userId: user.id });
      return user;
    }

    // Auto-provision new user if email provided
    if (!email) {
      logger.warn("Unable to auto-provision user without email", { clerkUserId });
      throw new AppError("User not found and email not provided for auto-provisioning", 404);
    }

    logger.info("Auto-provisioning new user", { clerkUserId, email });
    user = await this.upsertUser({
      clerkUserId,
      email,
      role: "END_USER",
    });

    logger.info("User resolved and provisioned", { clerkUserId, userId: user.id });

    return user;
  }
}
