import { AppError } from "../error.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { UpdateMyProfilePayload, UpsertUserPayload, UserEntity, UpdateUserRolePayload } from "../types/user.type.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findByClerkUserId(clerkUserId: string): Promise<UserEntity | null> {
    return this.userRepository.findByClerkUserId(clerkUserId);
  }

  findById(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findById(userId);
  }

  listAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.listAll();
  }

  upsertUser(payload: UpsertUserPayload): Promise<UserEntity> {
    return this.userRepository.upsertUser(payload);
  }

  async updateMyProfile(clerkUserId: string, payload: UpdateMyProfilePayload): Promise<UserEntity> {
    const user = await this.userRepository.updateMyProfile(clerkUserId, payload);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async updateUserRole(userId: string, payload: UpdateUserRolePayload): Promise<UserEntity> {
    const user = await this.userRepository.updateUserRole(userId, payload);
    if (!user) {
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
    // Try to find existing user
    let user = await this.findByClerkUserId(clerkUserId);

    if (user) {
      return user;
    }

    // Auto-provision new user if email provided
    if (!email) {
      throw new AppError("User not found and email not provided for auto-provisioning", 404);
    }

    user = await this.upsertUser({
      clerkUserId,
      email,
      role: "END_USER",
    });

    return user;
  }
}
