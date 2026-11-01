# MarginNote

Highlight text and write notes on any web page, see them again when you come back, search everything later, and get a quick summary of a page from a small model that runs inside the browser.

Work in progress. Parts:

- `extension/`: Chrome extension (Manifest V3, React, TypeScript, Vite) for highlighting, notes and in-browser summaries with Transformers.js
- `api/`: Express + TypeScript API that syncs notes to PostgreSQL with full-text search
- `dashboard/`: Next.js app for browsing, searching, editing and exporting notes

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

## API

Express 5 + TypeScript, request validation with zod, migrations run on startup.

```bash
npm run dev -w api       # http://localhost:4000
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Database status (never needs a token) |
| POST | `/highlights` | Save a highlight; creates the page from its URL if needed |
| GET | `/highlights?url=` | Highlights on one page, so the extension can repaint them |
| PATCH | `/highlights/:id` | Change note, color or tags |
| DELETE | `/highlights/:id` | Delete a highlight |
| GET | `/pages` | Pages with highlight counts, most recently highlighted first (`limit`, `offset`, `domain`) |
| GET | `/pages/:id` | One page with all its highlights |
| PATCH | `/pages/:id` | Update title or the in-browser summary |
| GET | `/pages/:id/export.md` | Page and highlights as Markdown |
| GET | `/search` | Full-text search with `<mark>` snippets (`q`, `tag`, `color`, `limit`, `offset`) |
| GET | `/tags` | Tags with usage counts |

`q` accepts web-search syntax (`react hooks`, `"exact phrase"`, `-class`). Invalid input returns `400` with the failing fields, unknown ids `404`. Set `API_TOKEN` to require `Authorization: Bearer <token>`.

## Extension

Chrome Manifest V3, React + TypeScript, built with Vite.

- Select text on any page and click the floating **Highlight** button, use the context menu, or press **Alt+Shift+H**
- Highlights are stored with a text-quote anchor (`exact` + 32 chars of `prefix`/`suffix`) and repainted when you come back, even when the same sentence appears twice on the page or the selection spans several elements
- The popup lists the page's highlights: click to scroll to one, edit the note, change color, delete
- **Summarize this page** runs a summarization model locally with Transformers.js (t5-small ~75 MB, or distilbart-cnn ~270 MB, picked in the options page). ONNX Runtime ships inside the extension because MV3 forbids loading code from a CDN; only the model weights are downloaded from the Hugging Face Hub, once
- The content script never calls the API itself (page CORS would block it); the service worker does

```bash
npm run build -w extension
```

Then open `chrome://extensions`, enable Developer mode, **Load unpacked**, and pick `extension/dist`. Set the API URL (and token, if any) on the extension's options page.

## Dashboard

Next.js 16 (App Router, Cache Components) + Tailwind CSS.

- **Library**: pages with highlight counts, most recently highlighted first, paged, filter by domain
- **Page view**: summary and highlights; edit the note and tags, change color or delete inline; **Export .md** downloads the page as Markdown
- **Search**: full-text search with web-search syntax, matched words marked, filter by tag and color
- **Tags**: tag cloud, each tag links to its search results

All API calls run on the server (server components, server actions and one route handler for the export), so `API_TOKEN` never reaches the browser. Search snippets are rendered as text with only the `<mark>` tags turned into elements, because `ts_headline` doesn't escape the highlight text.

```bash
cp dashboard/.env.example dashboard/.env.local   # API_URL, API_TOKEN
npm run dev -w dashboard                          # http://localhost:3000
```

## License

MIT
