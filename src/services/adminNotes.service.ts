import { NoteModel } from "../models/note";
import { toPage, type Pagination } from "../utils/pagination";

// Admin: everyone's notes, newest first.
// - find().sort({ _id: -1 }) walks the built-in _id index: no extra index.
// - estimatedDocumentCount(): O(1) total from collection metadata.
// - populate("owner") runs ONE extra query, users.find({ _id: { $in: [...] } }),
//   which is served by the users _id index (no N+1 queries).
export async function listAllNotes(p: Pagination) {
  const [items, total] = await Promise.all([
    NoteModel.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit).populate("owner", "name email"),
    NoteModel.estimatedDocumentCount(),
  ]);
  return toPage(items, total, p);
}
