import "dotenv/config";
import { z } from "zod";

// Validate environment variables once at startup (fail fast), like
// @ConfigurationProperties + @Validated in Spring Boot.
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  // HS256 secret: long and random. Generate with:
  // node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1d"),
});

export const env = schema.parse(process.env);
