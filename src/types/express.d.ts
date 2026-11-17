import type { Role } from "../models/user";

// Adds req.auth (set by the authenticate middleware) to Express's Request type,
// similar to reading the principal from SecurityContextHolder in Spring.
declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
