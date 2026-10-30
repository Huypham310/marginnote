# MarginNote

Highlight text and write notes on any web page, see them again when you come back, search everything later, and get a quick summary of a page from a small model that runs inside the browser.

Work in progress. Planned parts:

- `extension/`: Chrome extension (Manifest V3, React, TypeScript, Vite) for highlighting, notes and in-browser summaries with Transformers.js
- `api/`: Express + TypeScript API that syncs notes to PostgreSQL with full-text search
- `dashboard/`: Next.js library for browsing, searching and exporting notes

No paid APIs: summarization runs locally in the browser.

## Data model

PostgreSQL, two tables (`api/migrations/001_init.sql`):

- `pages`: one row per normalized URL (lowercase host, no `www.`, no `#fragment`, no `utm_*`/`fbclid`-style tracking params, sorted query, no trailing slash), so the same article opened from different links maps to one page
- `highlights`: selected text, optional note, color, tags, and a W3C-style text-quote anchor (`exact` + `prefix` + `suffix`) used to find the passage again when the page is reopened

Full-text search uses a generated `tsvector` column (highlight text weighted above the note) with a GIN index.

```bash
docker compose up -d db
cp api/.env.example api/.env
npm install
npm run migrate -w api
npm run seed -w api      # 25 fake pages / 100 highlights (Faker, fixed seed)
```

## License

MIT
