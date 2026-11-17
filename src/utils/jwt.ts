import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../models/user";

export interface TokenPayload {
  sub: string; // user id
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign({ role: payload.role }, env.JWT_SECRET, {
    subject: payload.sub,
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

// Throws if the signature is invalid or the token is expired.
// Pinning the algorithm blocks "alg: none" / algorithm-confusion attacks.
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || !decoded.sub) throw new Error("Malformed token");
  return { sub: decoded.sub, role: decoded.role as Role };
}
