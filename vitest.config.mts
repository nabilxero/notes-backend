import { defineConfig } from "vitest/config";

// Tests run against a separate database on the local MongoDB (docker compose up -d).
// These values are set before dotenv runs, so they win over .env.
export default defineConfig({
  test: {
    env: {
      MONGODB_URI: "mongodb://localhost:27017/notes_test",
      CORS_ORIGIN: "http://localhost:5173",
      JWT_SECRET: "test-secret-test-secret-test-secret-1234",
      JWT_EXPIRES_IN: "1h",
    },
    fileParallelism: false, // test files share one database
  },
});
