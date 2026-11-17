import { z } from "zod";
import { UserModel } from "../models/user";
import { HttpError } from "../middleware/error";
import { signToken } from "../utils/jwt";
import { hashPassword, isDuplicateKeyError, passwordSchema, verifyPassword } from "../utils/password";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Used when the email is unknown so login takes the same time either way
// (prevents discovering registered emails by timing the response).
const DUMMY_HASH_PROMISE = hashPassword("dummy-password-for-timing");

export async function register(input: z.infer<typeof registerSchema>) {
  const passwordHash = await hashPassword(input.password);
  try {
    // Role is never taken from the request: public sign-up always creates a "user".
    const user = await UserModel.create({ name: input.name, email: input.email, passwordHash });
    return { token: signToken({ sub: user.id, role: user.role }), user };
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new HttpError(409, "EMAIL_TAKEN", "Email is already registered");
    throw err;
  }
}

export async function login(input: z.infer<typeof loginSchema>) {
  // Uses the { email: 1 } unique index.
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await DUMMY_HASH_PROMISE));
  if (!user || !ok) {
    // Same message for "no such user" and "wrong password".
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  return { token: signToken({ sub: user.id, role: user.role }), user };
}

export async function getMe(userId: string) {
  // Uses the built-in _id index.
  const user = await UserModel.findById(userId);
  // Token is valid but the account is gone (e.g. deleted by an admin).
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Account no longer exists");
  return user;
}
