import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { USER_ROLES } from "../types/role.type.js";
import { getMe, listUsers, updateMe, upsertFromClerk } from "../controllers/user.controller.js";

export const userRouter = Router();

// the api gateway is sending the clerk user id 
userRouter.get("/me", getMe);
userRouter.patch("/me", updateMe);
userRouter.post("/upsert-from-clerk", upsertFromClerk);
userRouter.get("/admin/users", requireAuth, requireRole(USER_ROLES.APP_ADMIN), listUsers);
