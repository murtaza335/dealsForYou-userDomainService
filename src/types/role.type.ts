export const USER_ROLES = {
  END_USER: "END_USER",
  BRAND_ADMIN: "BRAND_ADMIN",
  APP_ADMIN: "APP_ADMIN",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const roleValues: UserRole[] = [
  USER_ROLES.END_USER,
  USER_ROLES.BRAND_ADMIN,
  USER_ROLES.APP_ADMIN,
];
