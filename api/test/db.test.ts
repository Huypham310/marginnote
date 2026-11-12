import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrate } from "../src/db/migrate.js";
import { seed } from "../src/db/seed.js";
import { useTestApp } from "./helpers.js";

const t = useTestApp();

describe("migrate", () => {
  it("records applied files and is a no-op the second time", async () => {
    // useTestApp already migrated the fresh database once
    expect(await migrate(t.pool())).toEqual([]);
    const { rows } = await t.pool().query("SELECT name FROM schema_migrations ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual(["001_init.sql", "002_tags_in_search.sql"]);
  });

  it("002 re-indexes highlights that existed before it", async () => {
    // replay the upgrade in a scratch schema: 001, a tagged row, then 002, all rolled back
    const dir = join(import.meta.dirname, "..", "migrations");
    const client = await t.pool().connect();
    try {
      await client.query("BEGIN");
      await client.query("CREATE SCHEMA upgrade_check; SET LOCAL search_path TO upgrade_check");
      await client.query(await readFile(join(dir, "001_init.sql"), "utf8"));
      await client.query(
        `WITH p AS (INSERT INTO pages (url, domain) VALUES ('https://a.test/x', 'a.test') RETURNING id)
         INSERT INTO highlights (page_id, text, anchor, tags)
         SELECT id, 'nothing relevant here', '{}'::jsonb, '{postgres}' FROM p`,
      );
      const before = await client.query(
        "SELECT search @@ to_tsquery('english', 'postgres') AS hit FROM highlights",
      );
      expect(before.rows[0].hit).toBe(false);
      await client.query(await readFile(join(dir, "002_tags_in_search.sql"), "utf8"));
      const after = await client.query(
        "SELECT search @@ to_tsquery('english', 'postgres') AS hit FROM highlights",
      );
      expect(after.rows[0].hit).toBe(true);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});

describe("seed", () => {
  it("is deterministic and doesn't duplicate highlights when run again", async () => {
    const first = await seed(t.pool(), 5);
    const second = await seed(t.pool(), 5);
    expect(second).toBe(first);

    const { rows } = await t.pool().query(
      "SELECT (SELECT count(*)::int FROM pages) AS pages, (SELECT count(*)::int FROM highlights) AS highlights",
    );
    expect(rows[0]).toEqual({ pages: 5, highlights: first });
  });

  it("builds clean urls", async () => {
    await seed(t.pool(), 5);
    const { rows } = await t.pool().query<{ url: string }>("SELECT url FROM pages");
    for (const { url } of rows) expect(new URL(url).pathname).not.toContain("//");
  });

  it("generates valid anchors (exact is the highlight text)", async () => {
    await seed(t.pool(), 3);
    const { rows } = await t.pool().query("SELECT text, anchor FROM highlights");
    for (const r of rows) expect(r.anchor.exact).toBe(r.text);
  });
});
