-- pages: one row per normalized URL (see src/lib/url.ts)
CREATE TABLE pages (
  id          BIGSERIAL PRIMARY KEY,
  url         TEXT NOT NULL UNIQUE,
  domain      TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  summary     TEXT,               -- filled in by the extension's local summarizer
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pages_domain_idx ON pages (domain);

-- highlights: the selected text plus enough context to find it again on the page.
-- anchor stores a W3C-style TextQuoteSelector: { exact, prefix, suffix }
CREATE TABLE highlights (
  id          BIGSERIAL PRIMARY KEY,
  page_id     BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  text        TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 5000),
  note        TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT 'yellow'
              CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'purple')),
  anchor      JSONB NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- full-text search over the highlighted text (weight A) and the note (weight B)
  search      TSVECTOR GENERATED ALWAYS AS (
                setweight(to_tsvector('english', text), 'A') ||
                setweight(to_tsvector('english', note), 'B')
              ) STORED
);

CREATE INDEX highlights_page_idx ON highlights (page_id);
CREATE INDEX highlights_search_idx ON highlights USING GIN (search);
CREATE INDEX highlights_tags_idx ON highlights USING GIN (tags);
CREATE INDEX highlights_created_idx ON highlights (created_at DESC);
