import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { NoteModel } from "../models/note";
import { HttpError } from "../middleware/error";
import { toPage, type Pagination } from "../utils/pagination";

export const noteInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10_000).default(""),
});
type NoteInput = z.infer<typeof noteInputSchema>;

// 404 (not 403) for someone else's note, so callers can't probe which ids exist.
const notFound = () => new HttpError(404, "NOT_FOUND", "Note not found");

function assertId(id: string): void {
  if (!isValidObjectId(id)) throw notFound();
}

export async function createNote(ownerId: string, input: NoteInput) {
  return NoteModel.create({ ...input, owner: ownerId });
}

// Index { owner: 1, _id: -1 } serves both queries.
export async function listOwnNotes(ownerId: string, p: Pagination) {
  const filter = { owner: ownerId };
  const [items, total] = await Promise.all([
    NoteModel.find(filter).sort({ _id: -1 }).skip(p.skip).limit(p.limit),
    NoteModel.countDocuments(filter),
  ]);
  return toPage(items, total, p);
}

// Every single-note query filters by BOTH _id and owner: ownership is enforced
// by the query itself, not by a separate check that could be forgotten.
export async function getOwnNote(ownerId: string, id: string) {
  assertId(id);
  const note = await NoteModel.findOne({ _id: id, owner: ownerId });
  if (!note) throw notFound();
  return note;
}

export async function updateOwnNote(ownerId: string, id: string, input: NoteInput) {
  assertId(id);
  const note = await NoteModel.findOneAndUpdate({ _id: id, owner: ownerId }, input, {
    returnDocument: "after", // return the updated document, not the old one
    runValidators: true,
  });
  if (!note) throw notFound();
  return note;
}

export async function deleteOwnNote(ownerId: string, id: string): Promise<void> {
  assertId(id);
  const { deletedCount } = await NoteModel.deleteOne({ _id: id, owner: ownerId });
  if (deletedCount === 0) throw notFound();
}
