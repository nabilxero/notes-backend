import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { createApp } from "../app";
import { NoteModel } from "../models/note";
import { useTestDb } from "../test/db";
import { planSummary } from "../test/explain";

const app = createApp("http://localhost:5173");

async function signUp(email: string) {
  const res = await request(app).post("/api/auth/register").send({ name: email, email, password: "password123" });
  return { token: res.body.token as string, id: res.body.user.id as string };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("notes", () => {
  useTestDb();

  it("requires authentication", async () => {
    expect((await request(app).get("/api/notes")).status).toBe(401);
  });

  it("creates, reads, updates and deletes own note", async () => {
    const { token } = await signUp("a@x.com");

    const created = await request(app).post("/api/notes").set(auth(token)).send({ title: " First ", content: "hello" });
    expect(created.status).toBe(201);
    expect(created.body.note).toMatchObject({ title: "First", content: "hello" });
    const id = created.body.note.id;

    const got = await request(app).get(`/api/notes/${id}`).set(auth(token));
    expect(got.body.note.title).toBe("First");

    const updated = await request(app).put(`/api/notes/${id}`).set(auth(token)).send({ title: "Renamed", content: "x" });
    expect(updated.status).toBe(200);
    expect(updated.body.note).toMatchObject({ title: "Renamed", content: "x" });

    expect((await request(app).delete(`/api/notes/${id}`).set(auth(token))).status).toBe(204);
    expect((await request(app).get(`/api/notes/${id}`).set(auth(token))).status).toBe(404);
  });

  it("validates input", async () => {
    const { token } = await signUp("a@x.com");
    const res = await request(app).post("/api/notes").set(auth(token)).send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for malformed ids", async () => {
    const { token } = await signUp("a@x.com");
    expect((await request(app).get("/api/notes/not-an-id").set(auth(token))).status).toBe(404);
  });

  it("hides other users' notes (404 on read, update, delete; absent from list)", async () => {
    const alice = await signUp("alice@x.com");
    const bob = await signUp("bob@x.com");
    const { body } = await request(app).post("/api/notes").set(auth(alice.token)).send({ title: "secret" });
    const id = body.note.id;

    expect((await request(app).get(`/api/notes/${id}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).put(`/api/notes/${id}`).set(auth(bob.token)).send({ title: "hacked" })).status).toBe(404);
    expect((await request(app).delete(`/api/notes/${id}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).get("/api/notes").set(auth(bob.token))).body.total).toBe(0);
    expect((await NoteModel.findById(id))!.title).toBe("secret");
  });

  it("paginates own notes newest first", async () => {
    const alice = await signUp("alice@x.com");
    const bob = await signUp("bob@x.com");
    for (let i = 1; i <= 25; i++) {
      await request(app).post("/api/notes").set(auth(alice.token)).send({ title: `n${i}` });
    }
    await request(app).post("/api/notes").set(auth(bob.token)).send({ title: "bob's" });

    const p1 = await request(app).get("/api/notes?page=1&limit=10").set(auth(alice.token));
    expect(p1.body).toMatchObject({ page: 1, limit: 10, total: 25, totalPages: 3 });
    expect(p1.body.items.map((n: { title: string }) => n.title).slice(0, 2)).toEqual(["n25", "n24"]);

    const p3 = await request(app).get("/api/notes?page=3&limit=10").set(auth(alice.token));
    expect(p3.body.items).toHaveLength(5);
    expect(p3.body.items.at(-1).title).toBe("n1");

    expect((await request(app).get("/api/notes?limit=500").set(auth(alice.token))).status).toBe(400);
  });

  describe("index usage (explain)", () => {
    it("list query uses { owner, _id } with no in-memory sort or collection scan", async () => {
      const alice = await signUp("alice@x.com");
      const plan = planSummary(
        await NoteModel.find({ owner: alice.id }).sort({ _id: -1 }).skip(10).limit(10).explain("queryPlanner"),
      );
      expect(plan.indexes).toContain("owner_1__id_-1");
      expect(plan.stages).not.toContain("COLLSCAN");
      expect(plan.stages).not.toContain("SORT");
    });

    it("count query uses the { owner } prefix of the same index", async () => {
      const alice = await signUp("alice@x.com");
      // countDocuments() runs an aggregate { $match, $group }; explain that pipeline directly.
      const result = await NoteModel.aggregate([
        { $match: { owner: new Types.ObjectId(alice.id) } },
        { $group: { _id: null, n: { $sum: 1 } } },
      ]).explain("queryPlanner");
      const plan = planSummary(result);
      expect(plan.indexes).toContain("owner_1__id_-1");
      expect(plan.stages).not.toContain("COLLSCAN");
    });

    it("single-note lookup by { _id, owner } uses the _id index", async () => {
      const alice = await signUp("alice@x.com");
      const note = await NoteModel.create({ owner: alice.id, title: "t" });
      const plan = planSummary(await NoteModel.findOne({ _id: note._id, owner: alice.id }).explain("queryPlanner"));
      expect(plan.stages).not.toContain("COLLSCAN");
      expect(plan.stages.some((s) => s === "IDHACK" || s === "EXPRESS_IXSCAN") || plan.indexes.includes("_id_")).toBe(true);
    });
  });
});
