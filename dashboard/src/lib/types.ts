// Shapes returned by the MarginNote API (see api/src/repo.ts)

export const COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
export type Color = (typeof COLORS)[number];

export interface Highlight {
  id: number;
  pageId: number;
  text: string;
  note: string;
  color: Color;
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

export interface PageDetail extends Page {
  highlights: Highlight[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchHit extends Highlight {
  url: string;
  pageTitle: string;
  /** ts_headline output with <mark> around matches; null when there was no query */
  snippet: string | null;
  rank: number;
}

export interface TagCount {
  tag: string;
  count: number;
}
