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
    expect(rows.map((r) => r.name)).toEqual(["001_init.sql"]);
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
