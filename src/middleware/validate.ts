import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "./error";

// Validates and normalises req.body against a Zod schema (like @Valid @RequestBody).
// On success req.body is replaced by the parsed value (unknown fields stripped).
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid request body", details);
    }
    req.body = result.data;
    next();
  };
}
