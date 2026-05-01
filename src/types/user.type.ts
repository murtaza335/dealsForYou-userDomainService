import type { UserRole } from "./role.type.js";

export interface UserEntity {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
  brandId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertUserPayload {
  clerkUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  tenantId?: string | null;
  brandId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateMyProfilePayload {
  firstName?: string | null;
  lastName?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

