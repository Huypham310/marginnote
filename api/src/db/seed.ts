import { faker } from "@faker-js/faker";
import type pg from "pg";
import { domainOf, normalizeUrl } from "../lib/url.js";
import { migrate } from "./migrate.js";
import { createPool } from "./pool.js";

const COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
const TAGS = ["ml", "react", "postgres", "career", "reading-list", "todo", "interview", "design"];

/** Fills the db with fake pages + highlights so the dashboard has something to show. */
export async function seed(pool: pg.Pool, pages = 25, seedValue = 42): Promise<number> {
  // seed cố định để mỗi lần chạy ra cùng một bộ dữ liệu
  faker.seed(seedValue);
  let highlights = 0;
  for (let i = 0; i < pages; i++) {
    const url = normalizeUrl(`${faker.internet.url()}/${faker.lorem.slug()}`);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO pages (url, domain, title)
       VALUES ($1, $2, $3)
       ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [url, domainOf(url), faker.lorem.sentence({ min: 3, max: 8 })],
    );
    const pageId = rows[0].id;

    const count = faker.number.int({ min: 1, max: 6 });
    for (let j = 0; j < count; j++) {
      const paragraph = faker.lorem.paragraph(3);
      const words = paragraph.split(" ");
      const start = faker.number.int({ min: 0, max: Math.max(words.length - 6, 0) });
      const exact = words.slice(start, start + faker.number.int({ min: 4, max: 12 })).join(" ");
      await pool.query(
        `INSERT INTO highlights (page_id, text, note, color, anchor, tags)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pageId,
          exact,
          faker.datatype.boolean() ? faker.lorem.sentence() : "",
          faker.helpers.arrayElement(COLORS),
          JSON.stringify({
            exact,
            prefix: words.slice(Math.max(start - 4, 0), start).join(" "),
            suffix: words.slice(start + 12, start + 16).join(" "),
          }),
          faker.helpers.arrayElements(TAGS, { min: 0, max: 2 }),
        ],
      );
      highlights++;
    }
  }
  return highlights;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const pool = createPool();
  migrate(pool)
    .then(() => seed(pool))
    .then((n) => console.log(`seeded ${n} highlights`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
