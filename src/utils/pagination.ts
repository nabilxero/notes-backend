import { z } from "zod";
import { HttpError } from "../middleware/error";

const MAX_LIMIT = 100;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
});

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

// Parses ?page=&limit= from the query string (like Spring's Pageable).
export function parsePagination(query: unknown): Pagination {
  const result = querySchema.safeParse(query);
  if (!result.success) {
    throw new HttpError(400, "VALIDATION_ERROR", `page must be >= 1 and limit between 1 and ${MAX_LIMIT}`);
  }
  const { page, limit } = result.data;
  return { page, limit, skip: (page - 1) * limit };
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function toPage<T>(items: T[], total: number, { page, limit }: Pagination): Page<T> {
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}
