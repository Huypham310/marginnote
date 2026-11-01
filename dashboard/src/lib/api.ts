import type { Color, Highlight, Page, PageDetail, Paged, SearchHit, TagCount } from "./types";

// Only imported from server components and server actions, so API_TOKEN stays on the server.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiUrl(): string {
  return (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
}

/** Builds a query string, skipping empty values so the API applies its own defaults. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (process.env.API_TOKEN) headers.set("Authorization", `Bearer ${process.env.API_TOKEN}`);
  if (init.body) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    // notes change all the time, don't let next cache them
    res = await fetch(`${apiUrl()}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(503, `Can't reach the MarginNote API at ${apiUrl()}`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `API error ${res.status}`);
  }
  return res;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(path, init);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  pages: (opts: { limit?: number; offset?: number; domain?: string } = {}) =>
    json<Paged<Page>>(`/pages${qs(opts)}`),
  page: (id: number) => json<PageDetail>(`/pages/${id}`),
  updatePage: (id: number, patch: { title?: string; summary?: string | null }) =>
    json<PageDetail>(`/pages/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  exportMarkdown: async (id: number) => (await request(`/pages/${id}/export.md`)).text(),

  search: (opts: { q?: string; tag?: string; color?: string; limit?: number; offset?: number }) =>
    json<Paged<SearchHit>>(`/search${qs(opts)}`),
  tags: () => json<TagCount[]>("/tags"),

  updateHighlight: (id: number, patch: { note?: string; color?: Color; tags?: string[] }) =>
    json<Highlight>(`/highlights/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteHighlight: (id: number) => json<void>(`/highlights/${id}`, { method: "DELETE" }),
};
