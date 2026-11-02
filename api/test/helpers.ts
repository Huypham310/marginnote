import type pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { createApp } from "../src/app.js";
import { migrate } from "../src/db/migrate.js";
import { createPool } from "../src/db/pool.js";
import { TEST_DATABASE_URL } from "./db-url.js";

/**
 * Sets up a pool + app for a test file: migrate once, empty tables before each test.
 * Returns getters because the values only exist after beforeAll ran.
 */
export function useTestApp(opts: { apiToken?: string } = {}) {
  let pool: pg.Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createPool(TEST_DATABASE_URL);
    await migrate(pool);
    app = createApp({ pool, apiToken: opts.apiToken });
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE highlights, pages RESTART IDENTITY CASCADE");
  });
  afterAll(async () => {
    await pool.end();
  });

  return {
    pool: () => pool,
    http: () => request(app),
  };
}

/** A valid POST /highlights body; override whatever the test cares about. */
export function newHighlight(over: Record<string, unknown> = {}) {
  return {
    url: "https://example.com/article",
    title: "An article",
    text: "the quick brown fox",
    anchor: { exact: "the quick brown fox", prefix: "", suffix: "" },
    ...over,
  };
}
