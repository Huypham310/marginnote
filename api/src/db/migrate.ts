import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type pg from "pg";
import { createPool } from "./pool.js";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "migrations");

/**
 * Applies every migrations/*.sql file that hasn't run yet, in filename order.
 * Each file runs in its own transaction so a broken migration leaves nothing half-applied.
 */
export async function migrate(pool: pg.Pool): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const done = new Set(rows.map((r) => r.name));

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      applied.push(file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}

// chạy trực tiếp: npm run migrate -w api
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const pool = createPool();
  migrate(pool)
    .then((applied) => console.log(applied.length ? `applied: ${applied.join(", ")}` : "up to date"))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
