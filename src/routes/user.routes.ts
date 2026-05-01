import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { USER_ROLES } from "../types/role.type.js";
import { getMe, listUsers, updateMe, upsertFromClerk } from "../controllers/user.controller.js";

export const userRouter = Router();

userRouter.get("/me", requireAuth, getMe);
userRouter.patch("/me", requireAuth, updateMe);
userRouter.post("/upsert-from-clerk", requireAuth, upsertFromClerk);

userRouter.get(
  "/admin/users",
  requireAuth,
  requireRole(USER_ROLES.APP_ADMIN),
  listUsers,
);
