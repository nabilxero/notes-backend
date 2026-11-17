import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/user";
import { HttpError } from "../middleware/error";
import { signToken } from "../utils/jwt";

// Cost factor 12: ~2^12 rounds; slow enough to hurt brute force, fast enough for login.
const BCRYPT_ROUNDS = 12;

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Used when the email is unknown so login takes the same time either way
// (prevents discovering registered emails by timing the response).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

export async function register(input: z.infer<typeof registerSchema>) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    // Role is never taken from the request: public sign-up always creates a "user".
    const user = await UserModel.create({ name: input.name, email: input.email, passwordHash });
    return { token: signToken({ sub: user.id, role: user.role }), user };
  } catch (err) {
    // 11000 = duplicate key on the unique email index.
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "EMAIL_TAKEN", "Email is already registered");
    }
    throw err;
  }
}

export async function login(input: z.infer<typeof loginSchema>) {
  // Uses the { email: 1 } unique index.
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
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
