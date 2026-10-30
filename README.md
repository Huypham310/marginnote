# MarginNote

Highlight text and write notes on any web page, see them again when you come back, search everything later, and get a quick summary of a page from a small model that runs inside the browser.

Work in progress. Planned parts:

- `extension/`: Chrome extension (Manifest V3, React, TypeScript, Vite) for highlighting, notes and in-browser summaries with Transformers.js
- `api/`: Express + TypeScript API that syncs notes to PostgreSQL with full-text search
- `dashboard/`: Next.js library for browsing, searching and exporting notes

No paid APIs: summarization runs locally in the browser.

## License

MIT
