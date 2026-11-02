import { describe, expect, it } from "vitest";
import { isTag, parseTags, sizeClass } from "./tags";

describe("parseTags", () => {
  it("splits on commas and spaces, lowercases, strips #, dedupes", () => {
    expect(parseTags("React, ml  #todo,react")).toEqual({ tags: ["react", "ml", "todo"] });
  });

  it("returns [] for an empty box (clears the tags)", () => {
    expect(parseTags("  , ")).toEqual({ tags: [] });
  });

  it("explains which tag is invalid", () => {
    const res = parseTags("ok, c++");
    expect(res).toEqual({ error: expect.stringContaining('"c++"') });
  });

  it("caps the number of tags like the API does", () => {
    const many = Array.from({ length: 11 }, (_, i) => `t${i}`).join(",");
    expect(parseTags(many)).toEqual({ error: "At most 10 tags" });
  });
});

describe("isTag", () => {
  it("matches the API's rules", () => {
    expect(isTag("reading-list")).toBe(true);
    expect(isTag("-leading")).toBe(false);
    expect(isTag("UPPER")).toBe(false);
    expect(isTag("x".repeat(33))).toBe(false);
  });
});

describe("sizeClass", () => {
  it("spreads counts linearly between min and max", () => {
    expect(sizeClass(1, 1, 15)).toBe("text-sm");
    expect(sizeClass(7, 1, 15)).toBe("text-base");
    expect(sizeClass(11, 1, 15)).toBe("text-lg");
    expect(sizeClass(15, 1, 15)).toBe("text-2xl");
  });

  it("uses one middle size when every tag has the same count", () => {
    expect(sizeClass(3, 3, 3)).toBe("text-base");
  });
});
