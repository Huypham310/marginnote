import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { useTestApp } from "./helpers.js";

const t = useTestApp({ apiToken: "s3cret" });

describe("API_TOKEN", () => {
  it("is required on every route except /health", async () => {
    await t.http().get("/health").expect(200, { status: "ok", database: true });
    const res = await t.http().get("/pages").expect(401);
    expect(res.body.error).toMatch(/token/i);
  });

  it("must match exactly", async () => {
    await t.http().get("/pages").set("Authorization", "Bearer wrong").expect(401);
    await t.http().get("/pages").set("Authorization", "s3cret").expect(401);
    await t.http().get("/pages").set("Authorization", "Bearer s3cret").expect(200);
  });
});

describe("GET /health", () => {
  it("reports 503 when the database is down", async () => {
    // nothing listens on port 1, so the query fails right away
    const pool = createPool("postgres://x:y@127.0.0.1:1/none");
    try {
      const res = await request(createApp({ pool })).get("/health").expect(503);
      expect(res.body).toEqual({ status: "degraded", database: false });
    } finally {
      await pool.end();
    }
  });
});

describe("createPool", () => {
  it("throws a helpful error without DATABASE_URL", () => {
    expect(() => createPool("")).toThrow(/DATABASE_URL/);
  });
});
