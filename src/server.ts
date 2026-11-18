import { env } from "./config/env";
import { connectDb } from "./config/db";
import { createApp } from "./app";

async function main() {
  await connectDb(env.MONGODB_URI);
  console.log("MongoDB connected");
  createApp(env.CORS_ORIGIN).listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}/api`);
  });
}

main().catch((err) => {
  console.error("Failed to start", err);
  process.exit(1);
});
