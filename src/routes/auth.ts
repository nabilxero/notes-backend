import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import * as auth from "../services/auth.service";

export const authRouter = Router();

// Express 5 forwards rejected promises from async handlers to the error middleware.
authRouter.post("/auth/register", validateBody(auth.registerSchema), async (req, res) => {
  res.status(201).json(await auth.register(req.body));
});

authRouter.post("/auth/login", validateBody(auth.loginSchema), async (req, res) => {
  res.json(await auth.login(req.body));
});

authRouter.get("/auth/me", authenticate, async (req, res) => {
  res.json({ user: await auth.getMe(req.auth!.userId) });
});
