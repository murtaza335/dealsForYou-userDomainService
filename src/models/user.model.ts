import { z } from "zod";
import { roleValues } from "../types/role.type.js";

export const upsertUserSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  role: z.enum(roleValues).optional(),
  brandId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMyProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
