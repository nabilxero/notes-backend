import type { NextFunction, Request, Response } from "express";
import { UserModel, type Role } from "../models/user";
import { HttpError } from "./error";

// Like @PreAuthorize("hasRole('ADMIN')"). Must run after `authenticate`.
//
// The role is re-read from the database (by _id -> built-in index) instead of
// trusting the role inside the JWT. A token lives for a day, so a demoted or
// deleted admin would otherwise keep admin access until it expired.
export function requireRole(...allowed: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = await UserModel.findById(req.auth!.userId).select("role").lean();
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Account no longer exists");
    if (!allowed.includes(user.role)) throw new HttpError(403, "FORBIDDEN", "Insufficient permissions");
    req.auth!.role = user.role; // keep req.auth in sync with the database
    next();
  };
}
