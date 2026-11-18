// Creates (or promotes) the admin account from environment variables.
// Public registration can never create an admin, so this is the only way in.
//
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... npm run seed:admin
//
// Safe to run repeatedly: an existing account with that email is promoted to admin
// and its password reset to ADMIN_PASSWORD; otherwise a new admin is created.
import { z } from "zod";
import { env } from "../config/env";
import { connectDb, disconnectDb } from "../config/db";
import { UserModel } from "../models/user";
import { hashPassword, passwordSchema } from "../utils/password";

const adminEnv = z
  .object({
    ADMIN_NAME: z.string().trim().min(1).default("Admin"),
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: passwordSchema,
  })
  .parse(process.env);

async function main() {
  await connectDb(env.MONGODB_URI);
  await UserModel.syncIndexes(); // make sure the unique email index exists before writing

  const email = adminEnv.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await hashPassword(adminEnv.ADMIN_PASSWORD);
  const existing = await UserModel.findOne({ email }); // email index

  if (existing) {
    existing.role = "admin";
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Promoted existing user ${email} to admin (password reset).`);
  } else {
    await UserModel.create({ name: adminEnv.ADMIN_NAME, email, passwordHash, role: "admin" });
    console.log(`Created admin ${email}.`);
  }
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
