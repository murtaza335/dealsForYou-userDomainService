import type { Pool } from "pg";
import type { UpdateMyProfilePayload, UpsertUserPayload, UserEntity } from "../types/user.type.js";

const mapRow = (row: Record<string, unknown>): UserEntity => {
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    email: String(row.email),
    firstName: (row.first_name as string | null) ?? null,
    lastName: (row.last_name as string | null) ?? null,
    role: String(row.role) as UserEntity["role"],
    isActive: Boolean(row.is_active),
    brandId: (row.brand_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
};

export class UserRepository {
  constructor(private readonly db: Pool) {}

  async findByClerkUserId(clerkUserId: string): Promise<UserEntity | null> {
    const result = await this.db.query(
      `SELECT *
       FROM users
       WHERE clerk_user_id = $1
       LIMIT 1`,
      [clerkUserId],
    );

    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async listAll(): Promise<UserEntity[]> {
    const result = await this.db.query(
      `SELECT *
       FROM users
       ORDER BY created_at DESC`,
    );

    return result.rows.map(mapRow);
  }

  async upsertUser(payload: UpsertUserPayload): Promise<UserEntity> {
    const result = await this.db.query(
      `INSERT INTO users (
          clerk_user_id,
          email,
          first_name,
          last_name,
          role,
          brand_id,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (clerk_user_id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          brand_id = EXCLUDED.brand_id,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
       RETURNING *`,
      [
        payload.clerkUserId,
        payload.email,
        payload.firstName ?? null,
        payload.lastName ?? null,
        payload.role ?? "END_USER",
        payload.brandId ?? null,
        payload.metadata ?? {},
      ],
    );

    return mapRow(result.rows[0]);
  }

  async updateMyProfile(clerkUserId: string, payload: UpdateMyProfilePayload): Promise<UserEntity | null> {
    const result = await this.db.query(
      `UPDATE users
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           metadata = COALESCE($4, metadata),
           updated_at = NOW()
       WHERE clerk_user_id = $1
       RETURNING *`,
      [clerkUserId, payload.firstName ?? null, payload.lastName ?? null, payload.metadata ?? null],
    );

    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }
}
