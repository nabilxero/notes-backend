import bcrypt from "bcryptjs";
import { z } from "zod";

// Cost factor 12: ~2^12 rounds; slow enough to hurt brute force, fast enough for login.
export const BCRYPT_ROUNDS = 12;

// bcrypt only uses the first 72 bytes, so longer passwords are rejected.
export const passwordSchema = z.string().min(8).max(72);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// MongoDB error 11000 = a unique index (here: users.email) rejected the write.
export function isDuplicateKeyError(err: unknown): boolean {
  return (err as { code?: number }).code === 11000;
}
