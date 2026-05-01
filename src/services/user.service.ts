import { AppError } from "../error.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { UpdateMyProfilePayload, UpsertUserPayload, UserEntity } from "../types/user.type.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findByClerkUserId(clerkUserId: string): Promise<UserEntity | null> {
    return this.userRepository.findByClerkUserId(clerkUserId);
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
}
