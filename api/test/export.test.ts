import { describe, expect, it } from "vitest";
import { pageToMarkdown } from "../src/export.js";
import type { Highlight, Page } from "../src/repo.js";

function page(over: Partial<Page> = {}, highlights: Partial<Highlight>[] = []) {
  return {
    id: 1,
    url: "https://example.com/a",
    domain: "example.com",
    title: "Title",
    summary: null,
    highlightCount: highlights.length,
    lastHighlightAt: null,
    ...over,
    highlights: highlights.map((h, i) => ({
      id: i + 1,
      pageId: 1,
      text: "text",
      note: "",
      color: "yellow",
      anchor: { exact: "text", prefix: "", suffix: "" },
      tags: [],
      createdAt: "",
      updatedAt: "",
      ...h,
    })),
  };
}

describe("pageToMarkdown", () => {
  it("renders title, link and one quote per highlight", () => {
    const md = pageToMarkdown(page({}, [{ text: "first" }, { text: "second" }]));
    expect(md).toBe(["## Title", "", "<https://example.com/a>", "", "> first", "", "> second", ""].join("\n"));
  });

  it("falls back to the url when there is no title", () => {
    expect(pageToMarkdown(page({ title: "" }))).toMatch(/^## https:\/\/example\.com\/a\n/);
  });

  it("quotes every line of a multi-line highlight", () => {
    const md = pageToMarkdown(page({}, [{ text: "line one\nline two\r\nline three" }]));
    expect(md).toContain("> line one\n> line two\n> line three");
  });

  it("adds summary, note and tags", () => {
    const md = pageToMarkdown(page({ summary: "short summary" }, [{ note: "my note", tags: ["ml", "todo"] }]));
    expect(md).toContain("**Summary:** short summary");
    expect(md).toContain("> text\n\nmy note\n\n#ml #todo");
  });
});
