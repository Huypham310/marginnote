-- Make tags searchable: a query for "postgres" should also find highlights tagged postgres,
-- ranked below matches in the text (A) and the note (B).
--
-- A generated column may only use IMMUTABLE functions, and array_to_string is declared STABLE
-- (it goes through the element type's output function). For text[] the result can't change,
-- so wrap it in an IMMUTABLE SQL function.
CREATE FUNCTION tags_to_text(tags TEXT[]) RETURNS TEXT
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT array_to_string(tags, ' ') $$;

-- Postgres < 17 can't change a generated column's expression in place: drop and re-add.
-- Re-adding recomputes it for every existing row; the GIN index goes with the column.
ALTER TABLE highlights DROP COLUMN search;
ALTER TABLE highlights ADD COLUMN search TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', text), 'A') ||
  setweight(to_tsvector('english', note), 'B') ||
  setweight(to_tsvector('english', tags_to_text(tags)), 'C')
) STORED;
CREATE INDEX highlights_search_idx ON highlights USING GIN (search);
