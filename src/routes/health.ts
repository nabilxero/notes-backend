import { Router } from "express";
import { isDbUp } from "../config/db";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", db: isDbUp() ? "up" : "down" });
});
