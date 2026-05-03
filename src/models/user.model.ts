import { z } from "zod";
import { roleValues } from "../types/role.type.js";

export const upsertUserSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  role: z.enum(roleValues).optional(),
  tenantId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const onboardConsumerSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  foodPreferences: z.array(z.string()).optional(),
});

export const onboardBrandAdminSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  title: z.string().min(1),
  brand: z.object({
    name: z.string().min(1),
    tagline: z.string().optional(),
    description: z.string().min(1),
    logoUrl: z.string().url().optional().or(z.literal("")),
    website: z.string().url().optional().or(z.literal("")),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(1),
    country: z.string().min(1),
    cities: z.array(z.string()).min(1),
    areas: z.array(z.string()).optional(),
    cuisineTags: z.array(z.string()).optional(),
    socials: z.record(z.string(), z.string()).optional(),
    notes: z.string().optional(),
    scrapeRequested: z.boolean(),
  }),
});

export const updateMyProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(roleValues),
});

