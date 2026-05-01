import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import { clerkMiddleware } from "@clerk/express";
import { userRouter } from "./routes/user.routes.js";
import { internalRouter } from "./routes/internal.routes.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "user-domain-service",
  });
});

// Public API routes
app.use("/api/users", userRouter);

// Internal API routes (for API gateway and inter-service communication)
app.use("/internal", internalRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
