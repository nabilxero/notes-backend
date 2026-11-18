import { afterAll, beforeAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../config/db";
import { env } from "../config/env";

// Call inside a describe() that needs MongoDB: connects to the test DB,
// builds indexes, and wipes all collections before each test.
export function useTestDb(): void {
  beforeAll(async () => {
    await connectDb(env.MONGODB_URI);
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  });
  afterAll(async () => {
    await disconnectDb();
  });
}
