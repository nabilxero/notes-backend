import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validateBody } from "../middleware/validate";
import { parsePagination } from "../utils/pagination";
import * as users from "../services/users.service";
import { listAllNotes } from "../services/adminNotes.service";

export const adminRouter = Router();

// Every route below: logged in AND admin (checked against the database).
adminRouter.use(["/users", "/admin"], authenticate, requireRole("admin"));

// ---- User management ----
adminRouter.get("/users", async (req, res) => {
  res.json(await users.listUsers(parsePagination(req.query)));
});

adminRouter.post("/users", validateBody(users.createUserSchema), async (req, res) => {
  res.status(201).json({ user: await users.createUser(req.body) });
});

adminRouter.get("/users/:id", async (req, res) => {
  res.json({ user: await users.getUser(req.params.id) });
});

adminRouter.put<{ id: string }>("/users/:id", validateBody(users.updateUserSchema), async (req, res) => {
  res.json({ user: await users.updateUser(req.auth!.userId, req.params.id, req.body) });
});

adminRouter.delete("/users/:id", async (req, res) => {
  await users.deleteUser(req.auth!.userId, req.params.id);
  res.status(204).end();
});

// ---- Everyone's notes ----
adminRouter.get("/admin/notes", async (req, res) => {
  res.json(await listAllNotes(parsePagination(req.query)));
});
