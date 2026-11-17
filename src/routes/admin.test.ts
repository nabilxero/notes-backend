import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { NoteModel } from "../models/note";
import { UserModel } from "../models/user";
import { hashPassword } from "../utils/password";
import { useTestDb } from "../test/db";
import { planSummary } from "../test/explain";

const app = createApp("http://localhost:5173");
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function signUp(email: string) {
  const res = await request(app).post("/api/auth/register").send({ name: email, email, password: "password123" });
  return { token: res.body.token as string, id: res.body.user.id as string };
}

// Admins can't self-register, so create one directly (what the seed script does).
async function makeAdmin(email = "admin@x.com") {
  await UserModel.create({ name: "Admin", email, passwordHash: await hashPassword("password123"), role: "admin" });
  const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return { token: res.body.token as string, id: res.body.user.id as string };
}

describe("admin", () => {
  useTestDb();

  it("rejects anonymous (401) and regular users (403)", async () => {
    const user = await signUp("u@x.com");
    expect((await request(app).get("/api/users")).status).toBe(401);
    expect((await request(app).get("/api/users").set(auth(user.token))).status).toBe(403);
    expect((await request(app).get("/api/admin/notes").set(auth(user.token))).status).toBe(403);
  });

  it("re-checks the role in the database: a demoted admin loses access immediately", async () => {
    const admin = await makeAdmin();
    expect((await request(app).get("/api/users").set(auth(admin.token))).status).toBe(200);
    await UserModel.updateOne({ _id: admin.id }, { role: "user" }); // token still says "admin"
    expect((await request(app).get("/api/users").set(auth(admin.token))).status).toBe(403);
  });

  it("lists users paginated, newest first, without password hashes", async () => {
    const admin = await makeAdmin();
    for (let i = 1; i <= 4; i++) await signUp(`u${i}@x.com`);
    const res = await request(app).get("/api/users?page=1&limit=2").set(auth(admin.token));
    expect(res.body).toMatchObject({ total: 5, totalPages: 3, page: 1, limit: 2 });
    expect(res.body.items.map((u: { email: string }) => u.email)).toEqual(["u4@x.com", "u3@x.com"]);
    expect(res.body.items[0].passwordHash).toBeUndefined();
  });

  it("creates, reads, updates and deletes users", async () => {
    const admin = await makeAdmin();
    const created = await request(app)
      .post("/api/users")
      .set(auth(admin.token))
      .send({ name: "Bob", email: "Bob@X.com", password: "password123", role: "admin" });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ name: "Bob", email: "bob@x.com", role: "admin" });
    const id = created.body.user.id;

    expect((await request(app).get(`/api/users/${id}`).set(auth(admin.token))).body.user.name).toBe("Bob");

    const updated = await request(app)
      .put(`/api/users/${id}`)
      .set(auth(admin.token))
      .send({ name: "Robert", role: "user", password: "newpassword1" });
    expect(updated.body.user).toMatchObject({ name: "Robert", role: "user", email: "bob@x.com" });
    // new password works
    const login = await request(app).post("/api/auth/login").send({ email: "bob@x.com", password: "newpassword1" });
    expect(login.status).toBe(200);

    expect((await request(app).delete(`/api/users/${id}`).set(auth(admin.token))).status).toBe(204);
    expect((await request(app).get(`/api/users/${id}`).set(auth(admin.token))).status).toBe(404);
  });

  it("rejects duplicate emails on create and update", async () => {
    const admin = await makeAdmin();
    await signUp("taken@x.com");
    const dupCreate = await request(app)
      .post("/api/users")
      .set(auth(admin.token))
      .send({ name: "X", email: "taken@x.com", password: "password123" });
    expect(dupCreate.status).toBe(409);
    const other = await signUp("other@x.com");
    const dupUpdate = await request(app).put(`/api/users/${other.id}`).set(auth(admin.token)).send({ email: "TAKEN@x.com" });
    expect(dupUpdate.status).toBe(409);
  });

  it("prevents an admin from deleting or demoting themselves", async () => {
    const admin = await makeAdmin();
    expect((await request(app).delete(`/api/users/${admin.id}`).set(auth(admin.token))).status).toBe(400);
    expect((await request(app).put(`/api/users/${admin.id}`).set(auth(admin.token)).send({ role: "user" })).status).toBe(400);
  });

  it("deleting a user also deletes their notes", async () => {
    const admin = await makeAdmin();
    const u = await signUp("u@x.com");
    await request(app).post("/api/notes").set(auth(u.token)).send({ title: "a" });
    await request(app).post("/api/notes").set(auth(u.token)).send({ title: "b" });
    await request(app).delete(`/api/users/${u.id}`).set(auth(admin.token));
    expect(await NoteModel.countDocuments({ owner: u.id })).toBe(0);
  });

  it("lists everyone's notes with owner name and email", async () => {
    const admin = await makeAdmin();
    const a = await signUp("a@x.com");
    const b = await signUp("b@x.com");
    await request(app).post("/api/notes").set(auth(a.token)).send({ title: "from a" });
    await request(app).post("/api/notes").set(auth(b.token)).send({ title: "from b" });

    const res = await request(app).get("/api/admin/notes?limit=10").set(auth(admin.token));
    expect(res.body.total).toBe(2);
    expect(res.body.items[0]).toMatchObject({ title: "from b", owner: { name: "b@x.com", email: "b@x.com" } });
    expect(res.body.items[0].owner.passwordHash).toBeUndefined();
  });

  describe("index usage (explain)", () => {
    it("admin lists sort by the built-in _id index (no SORT, no COLLSCAN)", async () => {
      for (const model of [UserModel, NoteModel] as const) {
        const plan = planSummary(await (model as typeof UserModel).find().sort({ _id: -1 }).limit(20).explain("queryPlanner"));
        expect(plan.indexes).toContain("_id_");
        expect(plan.stages).not.toContain("SORT");
        expect(plan.stages).not.toContain("COLLSCAN");
      }
    });
  });
});
