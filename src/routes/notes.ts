import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { parsePagination } from "../utils/pagination";
import * as notes from "../services/notes.service";

export const notesRouter = Router();

// Every /notes endpoint requires a logged-in user.
notesRouter.use("/notes", authenticate);

notesRouter.post("/notes", validateBody(notes.noteInputSchema), async (req, res) => {
  res.status(201).json({ note: await notes.createNote(req.auth!.userId, req.body) });
});

notesRouter.get("/notes", async (req, res) => {
  res.json(await notes.listOwnNotes(req.auth!.userId, parsePagination(req.query)));
});

notesRouter.get("/notes/:id", async (req, res) => {
  res.json({ note: await notes.getOwnNote(req.auth!.userId, req.params.id) });
});

// The <{ id: string }> generic types req.params; Express can't infer it when a
// middleware (validateBody) sits between the path and the handler.
notesRouter.put<{ id: string }>("/notes/:id", validateBody(notes.noteInputSchema), async (req, res) => {
  res.json({ note: await notes.updateOwnNote(req.auth!.userId, req.params.id, req.body) });
});

notesRouter.delete("/notes/:id", async (req, res) => {
  await notes.deleteOwnNote(req.auth!.userId, req.params.id);
  res.status(204).end();
});
