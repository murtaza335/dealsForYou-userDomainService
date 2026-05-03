import type { PrismaClient } from "../generated/prisma/client.js";
import { Prisma } from "../generated/prisma/client.js";
import type { UpdateMyProfilePayload, UpsertUserPayload, UserEntity, UpdateUserRolePayload } from "../types/user.type.js";
import { USER_ROLES, type UserRole } from "../types/role.type.js";
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
    const id = clerkUserId.trim();
    if (!id) return null;

    const user = await this.prisma.user.findUnique({
      where: { clerkUserId: id },
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

  async listByRole(role: UserRole): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: "desc" },
    });

    return users.map(mapUser);
  }

  async upsertUser(payload: UpsertUserPayload): Promise<UserEntity> {
    const clerkKey = payload.clerkUserId.trim();
    if (!clerkKey) {
      throw new Error("clerkUserId is required");
    }

    const existingByClerkId = await this.prisma.user.findUnique({
      where: { clerkUserId: clerkKey },
    });

    // Only check for existing email if there's no existing user with the same clerkUserId
    const existingByEmail = existingByClerkId
      ? null
      : await this.prisma.user.findUnique({
          where: { email: payload.email },
        });

    const existing = existingByClerkId ?? existingByEmail;

    let role: UserRole = (payload.role ?? USER_ROLES.END_USER) as UserRole;
    let metadata = (payload.metadata ?? {}) as Prisma.InputJsonValue;

    if (existing) {
      const elevated =
        existing.role === USER_ROLES.BRAND_ADMIN || existing.role === USER_ROLES.APP_ADMIN;
      const incomingRole = (payload.role ?? USER_ROLES.END_USER) as UserRole;
      if (elevated && incomingRole === USER_ROLES.END_USER) {
        role = existing.role;
        metadata = {
          ...((existing.metadata as Record<string, unknown>) ?? {}),
          ...((payload.metadata as Record<string, unknown>) ?? {}),
        } as Prisma.InputJsonValue;
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      email: payload.email,
      role,
      metadata,
    };
    const createData: Prisma.UserCreateInput = {
      clerkUserId: clerkKey,
      email: payload.email,
      role,
      isActive: payload.isActive ?? true,
      metadata,
    };

    if (payload.firstName !== undefined) {
      updateData.firstName = payload.firstName;
      createData.firstName = payload.firstName;
    }
    if (payload.lastName !== undefined) {
      updateData.lastName = payload.lastName;
      createData.lastName = payload.lastName;
    }
    if (payload.tenantId !== undefined) {
      updateData.tenantId = payload.tenantId;
      createData.tenantId = payload.tenantId;
    }
    if (payload.brandId !== undefined) {
      updateData.brandId = payload.brandId;
      createData.brandId = payload.brandId;
    }
    if (payload.isActive !== undefined) {
      updateData.isActive = payload.isActive;
    }

    const user = existingByClerkId || existingByEmail
      ? await this.prisma.user.update({
          where: { id: (existingByClerkId ?? existingByEmail)!.id },
          data: {
            ...updateData,
            clerkUserId: clerkKey,
          },
        })
      : await this.prisma.user.create({
          data: createData,
        });

    return mapUser(user);
  }
  //end of this function (can change it back later)

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

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserEntity | null> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    }).catch(() => null);

    if (!user) return null;
    return mapUser(user);
  }

  async deleteUser(userId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.delete({
      where: { id: userId },
    }).catch(() => null);

    if (!user) return null;
    return mapUser(user);
  }
}
