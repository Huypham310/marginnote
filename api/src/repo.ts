import type pg from "pg";
import { domainOf, normalizeUrl } from "./lib/url.js";
import type { CreateHighlight, SearchQuery, UpdateHighlight } from "./schemas.js";

export interface Highlight {
  id: number;
  pageId: number;
  text: string;
  note: string;
  color: string;
  anchor: { exact: string; prefix: string; suffix: string };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: number;
  url: string;
  domain: string;
  title: string;
  summary: string | null;
  highlightCount: number;
  lastHighlightAt: string | null;
}

// BIGSERIAL comes back as a string from pg; ids here are small enough for JS numbers
const HIGHLIGHT_COLUMNS = `
  h.id::int AS "id", h.page_id::int AS "pageId", h.text, h.note, h.color, h.anchor, h.tags,
  h.created_at AS "createdAt", h.updated_at AS "updatedAt"`;

const PAGE_COLUMNS = `
  p.id::int AS "id", p.url, p.domain, p.title, p.summary,
  count(h.id)::int AS "highlightCount", max(h.created_at) AS "lastHighlightAt"`;

export function makeRepo(pool: pg.Pool) {
  return {
    /** Adds a highlight, creating (or retitling) its page in the same transaction. */
    async createHighlight(input: CreateHighlight): Promise<Highlight & { url: string }> {
      const url = normalizeUrl(input.url);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const page = await client.query<{ id: number }>(
          `INSERT INTO pages (url, domain, title) VALUES ($1, $2, $3)
           ON CONFLICT (url) DO UPDATE
             SET title = CASE WHEN EXCLUDED.title <> '' THEN EXCLUDED.title ELSE pages.title END,
                 updated_at = now()
           RETURNING id::int AS id`,
          [url, domainOf(url), input.title],
        );
        const { rows } = await client.query<Highlight>(
          `INSERT INTO highlights AS h (page_id, text, note, color, anchor, tags)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING ${HIGHLIGHT_COLUMNS}`,
          [page.rows[0].id, input.text, input.note, input.color, input.anchor, input.tags],
        );
        await client.query("COMMIT");
        return { ...rows[0], url };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async highlightsForUrl(rawUrl: string): Promise<Highlight[]> {
      const { rows } = await pool.query<Highlight>(
        `SELECT ${HIGHLIGHT_COLUMNS} FROM highlights h JOIN pages p ON p.id = h.page_id
         WHERE p.url = $1 ORDER BY h.created_at`,
        [normalizeUrl(rawUrl)],
      );
      return rows;
    },

    async updateHighlight(id: number, patch: UpdateHighlight): Promise<Highlight | null> {
      // COALESCE keeps fields that weren't sent
      const { rows } = await pool.query<Highlight>(
        `UPDATE highlights h SET
           note = COALESCE($2, note), color = COALESCE($3, color), tags = COALESCE($4, tags),
           updated_at = now()
         WHERE id = $1 RETURNING ${HIGHLIGHT_COLUMNS}`,
        [id, patch.note ?? null, patch.color ?? null, patch.tags ?? null],
      );
      return rows[0] ?? null;
    },

    async deleteHighlight(id: number): Promise<boolean> {
      const { rowCount } = await pool.query("DELETE FROM highlights WHERE id = $1", [id]);
      return rowCount === 1;
    },

    async listPages(opts: { limit: number; offset: number; domain?: string }) {
      const where = opts.domain ? "WHERE p.domain = $3" : "";
      const params: unknown[] = [opts.limit, opts.offset];
      if (opts.domain) params.push(opts.domain);
      const [items, total] = await Promise.all([
        pool.query<Page>(
          `SELECT ${PAGE_COLUMNS} FROM pages p LEFT JOIN highlights h ON h.page_id = p.id
           ${where} GROUP BY p.id
           ORDER BY max(h.created_at) DESC NULLS LAST, p.id DESC LIMIT $1 OFFSET $2`,
          params,
        ),
        pool.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pages p ${opts.domain ? "WHERE p.domain = $1" : ""}`,
          opts.domain ? [opts.domain] : [],
        ),
      ]);
      return { items: items.rows, total: total.rows[0].n, limit: opts.limit, offset: opts.offset };
    },

    async getPage(id: number): Promise<(Page & { highlights: Highlight[] }) | null> {
      const page = await pool.query<Page>(
        `SELECT ${PAGE_COLUMNS} FROM pages p LEFT JOIN highlights h ON h.page_id = p.id
         WHERE p.id = $1 GROUP BY p.id`,
        [id],
      );
      if (!page.rows[0]) return null;
      const highlights = await pool.query<Highlight>(
        `SELECT ${HIGHLIGHT_COLUMNS} FROM highlights h WHERE h.page_id = $1 ORDER BY h.created_at`,
        [id],
      );
      return { ...page.rows[0], highlights: highlights.rows };
    },

    async updatePage(id: number, patch: { title?: string; summary?: string | null }) {
      // summary can be explicitly cleared with null, so it can't use COALESCE
      const { rows } = await pool.query<{ id: number }>(
        `UPDATE pages SET
           title = COALESCE($2, title),
           summary = CASE WHEN $3::boolean THEN $4 ELSE summary END,
           updated_at = now()
         WHERE id = $1 RETURNING id::int AS id`,
        [id, patch.title ?? null, "summary" in patch, patch.summary ?? null],
      );
      return rows[0] ? this.getPage(id) : null;
    },

    /**
     * Full-text search over highlight text + notes, newest first when there's no query.
     * websearch_to_tsquery accepts what people type ("react hooks", "-class", "exact phrase").
     */
    async search(q: SearchQuery) {
      const params: unknown[] = [];
      const where: string[] = [];
      let rank = "0";
      let snippet = "NULL";
      if (q.q) {
        params.push(q.q);
        where.push(`h.search @@ websearch_to_tsquery('english', $${params.length})`);
        rank = `ts_rank(h.search, websearch_to_tsquery('english', $${params.length}))`;
        // <mark> so the dashboard can render the match directly
        snippet = `ts_headline('english', h.text, websearch_to_tsquery('english', $${params.length}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10')`;
      }
      if (q.tag) {
        params.push(q.tag);
        where.push(`$${params.length} = ANY(h.tags)`);
      }
      if (q.color) {
        params.push(q.color);
        where.push(`h.color = $${params.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const countParams = [...params];
      params.push(q.limit, q.offset);

      const [items, total] = await Promise.all([
        pool.query(
          `SELECT ${HIGHLIGHT_COLUMNS}, p.url, p.title AS "pageTitle",
                  ${snippet} AS snippet, ${rank} AS rank
           FROM highlights h JOIN pages p ON p.id = h.page_id
           ${whereSql}
           ORDER BY rank DESC, h.created_at DESC
           LIMIT $${params.length - 1} OFFSET $${params.length}`,
          params,
        ),
        pool.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM highlights h ${whereSql}`,
          countParams,
        ),
      ]);
      return { items: items.rows, total: total.rows[0].n, limit: q.limit, offset: q.offset };
    },

    async tags(): Promise<{ tag: string; count: number }[]> {
      const { rows } = await pool.query<{ tag: string; count: number }>(
        `SELECT t AS tag, count(*)::int AS count FROM highlights, unnest(tags) t
         GROUP BY t ORDER BY count DESC, t`,
      );
      return rows;
    },
  };
}

export type Repo = ReturnType<typeof makeRepo>;
