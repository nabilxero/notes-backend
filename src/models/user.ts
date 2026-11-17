import { Schema, model, type InferSchemaType } from "mongoose";
import { toJSONOptions } from "./toJSON";

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    // select: false -> never loaded unless explicitly requested with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "user", required: true },
  },
  {
    timestamps: true,
    // Never serialise the hash, even if it was explicitly selected.
    toJSON: toJSONOptions(["passwordHash"]),
  },
);

// INDEXES
// Login looks users up by email: findOne({ email }). Unique also enforces
// "one account per email" at the database level (race-safe, unlike a check-then-insert).
userSchema.index({ email: 1 }, { unique: true });
// Lookups by id (GET /auth/me) use the built-in _id index; nothing to add.

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
