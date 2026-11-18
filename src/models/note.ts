import { Schema, Types, model, type InferSchemaType } from "mongoose";
import { toJSONOptions } from "./toJSON";

const noteSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: "", maxlength: 10_000 },
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

// INDEXES
// "List my notes, newest first, paginated":
//   find({ owner }).sort({ _id: -1 }).skip(n).limit(m)  +  countDocuments({ owner })
// Equality field first (owner), then the sort field (_id), so MongoDB walks the
// index in order and never sorts in memory. The count uses the { owner } prefix.
// _id is used as "creation order" because an ObjectId starts with its creation
// timestamp, so we don't need a separate createdAt index.
noteSchema.index({ owner: 1, _id: -1 });
// Get / update / delete one note: { _id, owner } is resolved by the built-in
// unique _id index (at most one match), then owner is checked on that one document.

export type Note = InferSchemaType<typeof noteSchema> & { _id: Types.ObjectId };
export const NoteModel = model("Note", noteSchema);
