import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/shared/api";
import { callBackground, callContent } from "../src/shared/messaging";
import { DEFAULT_SETTINGS, loadSettings } from "../src/shared/settings";

// minimal fake of the chrome APIs these modules touch
let stored: Record<string, unknown> = {};
const sendMessage = vi.fn();
const tabsSendMessage = vi.fn();

beforeEach(() => {
  stored = {};
  vi.stubGlobal("chrome", {
    storage: {
      sync: {
        // chrome fills in defaults for keys that were never saved
        get: vi.fn(async (defaults: Record<string, unknown>) => ({ ...defaults, ...stored })),
        set: vi.fn(async (patch: Record<string, unknown>) => Object.assign(stored, patch)),
      },
    },
    runtime: { sendMessage },
    tabs: { sendMessage: tabsSendMessage },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sendMessage.mockReset();
  tabsSendMessage.mockReset();
});

describe("loadSettings", () => {
  it("falls back to defaults", async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges what the user saved", async () => {
    stored = { apiUrl: "http://nas:4000", summaryModel: "better" };
    expect(await loadSettings()).toMatchObject({ apiUrl: "http://nas:4000", summaryModel: "better", apiToken: "" });
  });
});

describe("api client", () => {
  it("sends the token and json, strips a trailing slash from the url", async () => {
    stored = { apiUrl: "http://localhost:4000/", apiToken: "abc" };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.list("https://example.com/a?b=1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/highlights?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });

  it("surfaces the API's error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Highlight not found" }), { status: 404 })));
    await expect(api.remove(9)).rejects.toThrow("Highlight not found");
  });

  it("falls back to the status when the body isn't json", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })));
    await expect(api.remove(9)).rejects.toThrow("API error 502");
  });

  it("explains network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(api.list("https://a.com/")).rejects.toThrow(/Can't reach the MarginNote API/);
  });

  it("returns undefined for 204", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    await expect(api.remove(1)).resolves.toBeUndefined();
  });
});

describe("messaging", () => {
  it("unwraps ok responses and throws errors", async () => {
    sendMessage.mockResolvedValueOnce({ ok: true, data: 5 });
    await expect(callBackground({ type: "delete", id: 1 })).resolves.toBe(5);

    sendMessage.mockResolvedValueOnce({ ok: false, error: "nope" });
    await expect(callBackground({ type: "delete", id: 1 })).rejects.toThrow("nope");

    sendMessage.mockResolvedValueOnce(undefined);
    await expect(callBackground({ type: "delete", id: 1 })).rejects.toThrow(/didn't answer/);
  });

  it("gives a readable error on pages where the content script can't run", async () => {
    tabsSendMessage.mockRejectedValueOnce(new Error("Could not establish connection"));
    await expect(callContent(1, { type: "pageText" })).rejects.toThrow(/can't run on this page/);
  });
});
