import "dotenv/config";
import { z } from "zod";

// Validate environment variables once at startup (fail fast), like
// @ConfigurationProperties + @Validated in Spring Boot.
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
});

export const env = schema.parse(process.env);
