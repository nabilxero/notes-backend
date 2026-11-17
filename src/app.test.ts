import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

describe("GET /api/health", () => {
  const app = createApp("http://localhost:5173");

  it("returns ok (db reported as down when not connected)", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "down" });
  });

  it("returns the JSON error shape for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
