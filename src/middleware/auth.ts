import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { HttpError } from "./error";

// Like a Spring Security filter: reads "Authorization: Bearer <jwt>",
// verifies it and exposes the caller as req.auth. Rejects with 401 otherwise.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "UNAUTHENTICATED", "Missing bearer token");
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.auth = { userId: payload.sub, role: payload.role };
  } catch {
    throw new HttpError(401, "UNAUTHENTICATED", "Invalid or expired token");
  }
  next();
}
