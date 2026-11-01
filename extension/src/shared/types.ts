// Shapes shared by the content script, popup, options page and service worker.

export const COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
export type Color = (typeof COLORS)[number];

/** W3C TextQuoteSelector: the quote plus a bit of context on each side. */
export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
}

export interface Highlight {
  id: number;
  pageId: number;
  text: string;
  note: string;
  color: Color;
  anchor: Anchor;
  tags: string[];
  createdAt: string;
}

export interface NewHighlight {
  url: string;
  title: string;
  text: string;
  color: Color;
  anchor: Anchor;
}

/** Messages handled by the service worker (it does every API call, see background.ts). */
export type BgRequest =
  | { type: "save"; highlight: NewHighlight }
  | { type: "list"; url: string }
  | { type: "update"; id: number; patch: { note?: string; color?: Color; tags?: string[] } }
  | { type: "delete"; id: number }
  | { type: "saveSummary"; pageId: number; summary: string };

export type BgResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

/** Messages handled by the content script. */
export type ContentRequest =
  | { type: "highlightSelection"; color?: Color }
  | { type: "scrollTo"; id: number }
  | { type: "remove"; id: number }
  | { type: "recolor"; id: number; color: Color }
  | { type: "pageText" };
