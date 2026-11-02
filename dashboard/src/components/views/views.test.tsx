import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Highlight, Page, SearchHit } from "@/lib/types";
import { LibraryList } from "./LibraryList";
import { PageDetailView } from "./PageDetailView";
import { SearchResults } from "./SearchResults";
import { TagCloud } from "./TagCloud";

const api = vi.hoisted(() => ({ pages: vi.fn(), page: vi.fn(), search: vi.fn(), tags: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api }));
// next/form needs the app router; a plain form is enough to check the fields
vi.mock("next/form", () => ({
  default: ({ children, action }: { children: ReactNode; action: string }) => <form action={action}>{children}</form>,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/app/pages/[id]/actions", () => ({ updateHighlight: vi.fn(), deleteHighlight: vi.fn() }));

const sp = (v: Record<string, string>) => Promise.resolve(v);

const page = (id: number, over: Partial<Page> = {}): Page => ({
  id,
  url: `https://a.com/${id}`,
  domain: "a.com",
  title: `Page ${id}`,
  summary: null,
  highlightCount: 2,
  lastHighlightAt: new Date().toISOString(),
  ...over,
});

const hit = (over: Partial<SearchHit> = {}): SearchHit => ({
  id: 1,
  pageId: 4,
  text: "full text",
  note: "",
  color: "blue",
  anchor: { exact: "full text", prefix: "", suffix: "" },
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  url: "https://a.com/4",
  pageTitle: "Page 4",
  snippet: null,
  rank: 0,
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LibraryList", () => {
  it("asks the API for the right slice and shows the pages", async () => {
    api.pages.mockResolvedValue({ items: [page(1), page(2)], total: 42, limit: 20, offset: 20 });
    render(await LibraryList({ searchParams: sp({ page: "2", domain: "a.com" }) }));

    expect(api.pages).toHaveBeenCalledWith({ limit: 20, offset: 20, domain: "a.com" });
    expect(screen.getByRole("link", { name: "Page 1" })).toBeTruthy();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getByRole("link", { name: "show all" }).getAttribute("href")).toBe("/");
  });

  it("has an empty state and an error state", async () => {
    api.pages.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    render(await LibraryList({ searchParams: sp({}) }));
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
    cleanup();

    api.pages.mockRejectedValue(new ApiError(503, "Can't reach the MarginNote API"));
    render(await LibraryList({ searchParams: sp({}) }));
    expect(screen.getByRole("alert").textContent).toContain("Can't reach");
  });
});

describe("SearchResults", () => {
  it("drops filters the API would reject instead of erroring", async () => {
    api.search.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    api.tags.mockResolvedValue([]);
    await SearchResults({ searchParams: sp({ q: "  " + "x".repeat(250), tag: "Not A Tag", color: "orange" }) });
    expect(api.search).toHaveBeenCalledWith({ q: "x".repeat(200), tag: "", color: "", limit: 20, offset: 0 });
  });

  it("lowercases a valid tag from the url", async () => {
    api.search.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    api.tags.mockResolvedValue([]);
    await SearchResults({ searchParams: sp({ tag: "ML", color: "green" }) });
    expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ tag: "ml", color: "green" }));
  });

  it("shows snippets (or the full text) and keeps the form filled in", async () => {
    api.search.mockResolvedValue({
      items: [hit({ id: 1, snippet: "about <mark>hooks</mark>" }), hit({ id: 2, text: "no query match", pageTitle: "" })],
      total: 2,
      limit: 20,
      offset: 0,
    });
    api.tags.mockResolvedValue([{ tag: "react", count: 3 }]);
    const { container } = render(await SearchResults({ searchParams: sp({ q: "hooks", tag: "react" }) }));

    expect(container.querySelector("mark")?.textContent).toBe("hooks");
    expect(screen.getByText("no query match")).toBeTruthy();
    // no page title -> link shows the url
    expect(screen.getByRole("link", { name: "https://a.com/4" })).toBeTruthy();
    expect((screen.getByLabelText("Search text") as HTMLInputElement).value).toBe("hooks");
    expect((screen.getByLabelText("Tag") as HTMLSelectElement).value).toBe("react");
  });

  it("still renders the form when the API is down", async () => {
    api.search.mockRejectedValue(new ApiError(503, "Can't reach the MarginNote API"));
    api.tags.mockResolvedValue([]);
    render(await SearchResults({ searchParams: sp({ q: "x" }) }));
    expect(screen.getByLabelText("Search text")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("PageDetailView", () => {
  const h: Highlight = {
    id: 1,
    pageId: 3,
    text: "a quote",
    note: "",
    color: "pink",
    anchor: { exact: "a quote", prefix: "", suffix: "" },
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("shows the summary, highlights and export link", async () => {
    api.page.mockResolvedValue({ ...page(3, { summary: "tl;dr" }), highlights: [h] });
    render(await PageDetailView({ params: Promise.resolve({ id: "3" }) }));
    expect(screen.getByRole("heading", { name: "Page 3" })).toBeTruthy();
    expect(screen.getByText("tl;dr")).toBeTruthy();
    expect(screen.getByText("a quote")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Export .md" }).getAttribute("href")).toBe("/pages/3/export");
  });

  it("404s for junk ids and unknown pages, shows other errors inline", async () => {
    await expect(PageDetailView({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(api.page).not.toHaveBeenCalled();

    api.page.mockRejectedValueOnce(new ApiError(404, "Page not found"));
    await expect(PageDetailView({ params: Promise.resolve({ id: "9" }) })).rejects.toThrow("NEXT_NOT_FOUND");

    api.page.mockRejectedValueOnce(new ApiError(503, "Can't reach the MarginNote API"));
    render(await PageDetailView({ params: Promise.resolve({ id: "9" }) }));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("says so when every highlight was deleted", async () => {
    api.page.mockResolvedValue({ ...page(3, { highlightCount: 0 }), highlights: [] });
    render(await PageDetailView({ params: Promise.resolve({ id: "3" }) }));
    expect(screen.getByText(/No highlights left/)).toBeTruthy();
  });
});

describe("TagCloud", () => {
  it("sorts tags alphabetically and links them to search", async () => {
    api.tags.mockResolvedValue([
      { tag: "react", count: 9 },
      { tag: "ml", count: 1 },
    ]);
    render(await TagCloud());
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["#ml", "#react"]);
    expect(links[1].getAttribute("href")).toBe("/search?tag=react");
    expect(links[1].className).toContain("text-2xl");
  });

  it("has an empty state", async () => {
    api.tags.mockResolvedValue([]);
    render(await TagCloud());
    expect(screen.getByText(/No tags yet/)).toBeTruthy();
  });
});
