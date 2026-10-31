import { loadSettings } from "./settings";
import type { Color, Highlight, NewHighlight } from "./types";

/** Thin client for the MarginNote API. Only the service worker uses it. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiUrl, apiToken } = await loadSettings();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  let res: Response;
  try {
    res = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Can't reach the MarginNote API at ${apiUrl} (check the extension options)`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `API error ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  save: (h: NewHighlight) => request<Highlight>("/highlights", { method: "POST", body: JSON.stringify(h) }),
  list: (url: string) => request<Highlight[]>(`/highlights?url=${encodeURIComponent(url)}`),
  update: (id: number, patch: { note?: string; color?: Color; tags?: string[] }) =>
    request<Highlight>(`/highlights/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: number) => request<void>(`/highlights/${id}`, { method: "DELETE" }),
  saveSummary: (pageId: number, summary: string) =>
    request(`/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ summary }) }),
};
