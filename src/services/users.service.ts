import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { ROLES, UserModel } from "../models/user";
import { NoteModel } from "../models/note";
import { HttpError } from "../middleware/error";
import { hashPassword, isDuplicateKeyError, passwordSchema } from "../utils/password";
import { toPage, type Pagination } from "../utils/pagination";

// Admin-only user management.

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: passwordSchema,
  role: z.enum(ROLES).default("user"),
});

// Every field optional: only what is sent gets changed.
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(254).optional(),
  password: passwordSchema.optional(),
  role: z.enum(ROLES).optional(),
});

const notFound = () => new HttpError(404, "NOT_FOUND", "User not found");
const emailTaken = () => new HttpError(409, "EMAIL_TAKEN", "Email is already registered");

function assertId(id: string): void {
  if (!isValidObjectId(id)) throw notFound();
}

// Newest first. sort({ _id: -1 }) walks the built-in _id index backwards: no extra index.
// Total: estimatedDocumentCount() reads collection metadata (O(1)); an exact
// countDocuments({}) with no filter would have to scan.
export async function listUsers(p: Pagination) {
  const [items, total] = await Promise.all([
    UserModel.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit),
    UserModel.estimatedDocumentCount(),
  ]);
  return toPage(items, total, p);
}

export async function getUser(id: string) {
  assertId(id);
  const user = await UserModel.findById(id); // _id index
  if (!user) throw notFound();
  return user;
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  const { password, ...rest } = input;
  try {
    return await UserModel.create({ ...rest, passwordHash: await hashPassword(password) });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw emailTaken();
    throw err;
  }
}

export async function updateUser(actorId: string, id: string, input: z.infer<typeof updateUserSchema>) {
  assertId(id);
  // An admin can't demote themselves (prevents locking every admin out by accident).
  if (id === actorId && input.role && input.role !== "admin") {
    throw new HttpError(400, "CANNOT_DEMOTE_SELF", "You cannot remove your own admin role");
  }
  const { password, ...rest } = input;
  const changes = password ? { ...rest, passwordHash: await hashPassword(password) } : rest;
  try {
    const user = await UserModel.findByIdAndUpdate(id, changes, { returnDocument: "after", runValidators: true });
    if (!user) throw notFound();
    return user;
  } catch (err) {
    if (isDuplicateKeyError(err)) throw emailTaken();
    throw err;
  }
}

export async function deleteUser(actorId: string, id: string): Promise<void> {
  assertId(id);
  if (id === actorId) throw new HttpError(400, "CANNOT_DELETE_SELF", "You cannot delete your own account");
  const { deletedCount } = await UserModel.deleteOne({ _id: id });
  if (deletedCount === 0) throw notFound();
  // Remove the user's notes too. deleteMany({ owner }) uses the { owner, _id } index prefix.
  // (No transaction: a standalone MongoDB has none. Deleting the user first means a crash
  // in between leaves only unreachable notes, never a user with missing data.)
  await NoteModel.deleteMany({ owner: id });
}
