import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { UserModel } from "../models/user";
import { useTestDb } from "../test/db";

const app = createApp("http://localhost:5173");
const alice = { name: "Alice", email: "Alice@Example.com", password: "password123" };

describe("auth", () => {
  useTestDb();

  it("registers a user, hashes the password and never returns it", async () => {
    const res = await request(app).post("/api/auth/register").send(alice);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: "Alice", email: "alice@example.com", role: "user" });
    expect(res.body.user.passwordHash).toBeUndefined();

    const stored = await UserModel.findOne({ email: "alice@example.com" }).select("+passwordHash");
    expect(stored!.passwordHash).not.toBe(alice.password);
    expect(stored!.passwordHash.startsWith("$2")).toBe(true); // bcrypt format
  });

  it("ignores a role sent during registration", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...alice, role: "admin" });
    expect(res.body.user.role).toBe("user");
  });

  it("rejects duplicate emails with 409", async () => {
    await request(app).post("/api/auth/register").send(alice);
    const res = await request(app).post("/api/auth/register").send({ ...alice, email: "alice@example.com" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("validates input", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "bad", password: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in and returns the same generic error for wrong password and unknown email", async () => {
    await request(app).post("/api/auth/register").send(alice);

    const ok = await request(app).post("/api/auth/login").send({ email: alice.email, password: alice.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));

    const wrong = await request(app).post("/api/auth/login").send({ email: alice.email, password: "nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "nope-nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("GET /auth/me requires a valid token", async () => {
    const { body } = await request(app).post("/api/auth/register").send(alice);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("alice@example.com");

    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer garbage")).status).toBe(401);
  });
});
