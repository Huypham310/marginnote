import pg from "pg";
import { TEST_DATABASE_URL } from "./db-url.js";

/**
 * Recreates the test database before the run so every run starts from an empty schema
 * (and the migrations get exercised from scratch too).
 */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(name) || !name.endsWith("_test")) {
    // tránh lỡ tay drop database thật
    throw new Error(`refusing to recreate "${name}": test database names must end with _test`);
  }
  url.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: url.toString() });
  try {
    await admin.connect();
  } catch (err) {
    throw new Error(
      `can't connect to postgres for tests (${(err as Error).message}). Start it with: docker compose up -d db`,
    );
  }
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }
}
