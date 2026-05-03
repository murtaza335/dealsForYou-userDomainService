import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { USER_ROLES } from "../types/role.type.js";
import {
  getMe,
  deleteAdminUser,
  listUsers,
  listAdminUsers,
  onboardBrandAdmin,
  onboardConsumer,
  suspendAdminUser,
  updateMe,
  upsertFromClerk,
} from "../controllers/user.controller.js";

export const userRouter = Router();

// The API gateway forwards the Clerk user id in the user-id header for these routes.
userRouter.get("/me", getMe);
userRouter.patch("/me", updateMe);
userRouter.post("/upsert-from-clerk", upsertFromClerk);
userRouter.post("/onboard/consumer", onboardConsumer);
userRouter.post("/onboard/brand-admin", onboardBrandAdmin);

const requireGatewayInternal: import("express").RequestHandler = (req, res, next) => {
  const expected = process.env.API_GATEWAY_INTERNAL_SECRET;
  const provided = req.headers["x-api-gateway-secret"];

  if (expected && provided !== expected) {
    return res.status(401).json({ success: false, message: "Unauthorized internal request." });
  }

  if (!expected && process.env.NODE_ENV === "production") {
    return res.status(503).json({ success: false, message: "Internal gateway secret is not configured." });
  }

  next();
};

userRouter.get("/admin/internal/users", requireGatewayInternal, listAdminUsers);
userRouter.patch("/admin/internal/users/:userId/suspend", requireGatewayInternal, suspendAdminUser);
userRouter.delete("/admin/internal/users/:userId", requireGatewayInternal, deleteAdminUser);

userRouter.get(
  "/admin/users",
  requireAuth,
  requireRole(USER_ROLES.APP_ADMIN),
  listUsers,
);
