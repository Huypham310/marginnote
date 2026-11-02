import { describe, expect, it } from "vitest";
import {
  createHighlightSchema,
  idParam,
  listPagesSchema,
  searchSchema,
  updateHighlightSchema,
  updatePageSchema,
} from "../src/schemas.js";
import { newHighlight } from "./helpers.js";

describe("createHighlightSchema", () => {
  it("fills defaults", () => {
    const parsed = createHighlightSchema.parse(newHighlight({ title: undefined }));
    expect(parsed).toMatchObject({ title: "", note: "", color: "yellow", tags: [] });
  });

  it("normalizes tags to lowercase and trims them", () => {
    const parsed = createHighlightSchema.parse(newHighlight({ tags: ["  React ", "ML"] }));
    expect(parsed.tags).toEqual(["react", "ml"]);
  });

  it.each([
    ["non-http url", { url: "ftp://example.com/a" }],
    ["blank text", { text: "   " }],
    ["unknown color", { color: "orange" }],
    ["tag with spaces", { tags: ["two words"] }],
    ["too many tags", { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
    ["missing anchor", { anchor: undefined }],
  ])("rejects %s", (_name, over) => {
    expect(createHighlightSchema.safeParse(newHighlight(over)).success).toBe(false);
  });
});

describe("update schemas", () => {
  it("need at least one field", () => {
    expect(updateHighlightSchema.safeParse({}).success).toBe(false);
    expect(updatePageSchema.safeParse({}).success).toBe(false);
  });

  it("allow clearing the summary with null", () => {
    expect(updatePageSchema.parse({ summary: null })).toEqual({ summary: null });
  });
});

describe("query schemas", () => {
  it("coerce paging params from strings and apply defaults", () => {
    expect(listPagesSchema.parse({ limit: "5", offset: "10" })).toEqual({ limit: 5, offset: 10 });
    expect(searchSchema.parse({})).toEqual({ q: "", limit: 20, offset: 0 });
  });

  it("cap the page size", () => {
    expect(listPagesSchema.safeParse({ limit: "500" }).success).toBe(false);
  });

  it("only accept positive integer ids", () => {
    expect(idParam.parse({ id: "42" })).toEqual({ id: 42 });
    for (const id of ["0", "-1", "1.5", "abc"]) expect(idParam.safeParse({ id }).success).toBe(false);
  });
});
