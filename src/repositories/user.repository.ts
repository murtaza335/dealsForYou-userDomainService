import type { PrismaClient } from "../generated/prisma/client.js";
import { Prisma } from "../generated/prisma/client.js";
import type { UpdateMyProfilePayload, UpsertUserPayload, UserEntity, UpdateUserRolePayload } from "../types/user.type.js";
import type { User } from "../generated/prisma/client.js";

const mapUser = (user: User): UserEntity => {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tenantId: user.tenantId,
    isActive: user.isActive,
    brandId: user.brandId,
    metadata: user.metadata as Record<string, unknown>,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByClerkUserId(clerkUserId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user) return null;
    return mapUser(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;
    return mapUser(user);
  }

  async listAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return users.map(mapUser);
  }

  async upsertUser(payload: UpsertUserPayload): Promise<UserEntity> {
    const role = payload.role ?? "END_USER";
    const user = await this.prisma.user.upsert({
      where: { clerkUserId: payload.clerkUserId },
      update: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role,
        tenantId: payload.tenantId,
        brandId: payload.brandId,
        metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue,
      },
      create: {
        clerkUserId: payload.clerkUserId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role,
        tenantId: payload.tenantId,
        brandId: payload.brandId,
        metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return mapUser(user);
  }

  async updateMyProfile(clerkUserId: string, payload: UpdateMyProfilePayload): Promise<UserEntity | null> {
    const user = await this.prisma.user.update({
      where: { clerkUserId },
      data: {
        firstName: payload.firstName ?? undefined,
        lastName: payload.lastName ?? undefined,
        metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : undefined,
      },
    }).catch(() => null);

    if (!user) return null;
    return mapUser(user);
  }

  async updateUserRole(userId: string, payload: UpdateUserRolePayload): Promise<UserEntity | null> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: payload.role },
    }).catch(() => null);

    if (!user) return null;
    return mapUser(user);
  }
}

