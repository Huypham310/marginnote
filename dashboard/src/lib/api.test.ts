import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, qs } from "./api";

function mockFetch(res: Response | (() => never)) {
  const fn = vi.fn(async () => (typeof res === "function" ? res() : res));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("qs", () => {
  it("skips empty values", () => {
    expect(qs({ q: "react hooks", tag: "", color: undefined, limit: 20, offset: 0 })).toBe("?q=react+hooks&limit=20&offset=0");
    expect(qs({})).toBe("");
  });
});

describe("api", () => {
  it("uses API_URL + API_TOKEN and never caches", async () => {
    vi.stubEnv("API_URL", "http://api:4000/");
    vi.stubEnv("API_TOKEN", "tok");
    const fetch = mockFetch(Response.json({ items: [], total: 0, limit: 20, offset: 0 }));

    await api.pages({ domain: "a.com", limit: 20 });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api:4000/pages?domain=a.com&limit=20");
    expect(init.cache).toBe("no-store");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("sends json bodies for updates", async () => {
    const fetch = mockFetch(Response.json({ id: 1 }));
    await api.updateHighlight(1, { color: "green" });
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"color":"green"}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("throws ApiError with the API's message and status", async () => {
    mockFetch(Response.json({ error: "Page not found" }, { status: 404 }));
    const err = await api.page(5).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, message: "Page not found" });
  });

  it("turns a network failure into a 503 ApiError", async () => {
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(api.tags()).rejects.toMatchObject({ status: 503, message: expect.stringContaining("Can't reach") });
  });

  it("returns the export as text and nothing for 204", async () => {
    mockFetch(new Response("## Title\n", { headers: { "Content-Type": "text/markdown" } }));
    expect(await api.exportMarkdown(1)).toBe("## Title\n");

    mockFetch(new Response(null, { status: 204 }));
    expect(await api.deleteHighlight(1)).toBeUndefined();
  });
});
