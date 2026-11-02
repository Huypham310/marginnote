import { describe, expect, it } from "vitest";
import { parseId } from "./ids";
import { slugify } from "./slug";
import { splitSnippet } from "./snippet";

describe("splitSnippet", () => {
  it("splits on <mark> markers", () => {
    expect(splitSnippet("use <mark>react</mark> <mark>hooks</mark> wisely")).toEqual([
      { text: "use ", match: false },
      { text: "react", match: true },
      { text: " ", match: false },
      { text: "hooks", match: true },
      { text: " wisely", match: false },
    ]);
  });

  it("keeps any other html as plain text", () => {
    const parts = splitSnippet('<img src=x onerror="alert(1)"> <mark>payload</mark>');
    expect(parts[0]).toEqual({ text: '<img src=x onerror="alert(1)"> ', match: false });
    expect(parts[1]).toEqual({ text: "payload", match: true });
  });

  it("handles text without matches", () => {
    expect(splitSnippet("plain")).toEqual([{ text: "plain", match: false }]);
    expect(splitSnippet("")).toEqual([]);
  });
});

describe("slugify", () => {
  it("makes a safe file name", () => {
    expect(slugify("React Hooks: A Guide (2026)!")).toBe("react-hooks-a-guide-2026");
    expect(slugify("Tiếng Việt có dấu")).toBe("tieng-viet-co-dau");
  });

  it("caps the length without a dangling dash", () => {
    const s = slugify("word ".repeat(30));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });

  it("falls back when nothing is left", () => {
    expect(slugify("!!!")).toBe("page");
    expect(slugify("日本語")).toBe("page");
  });
});

describe("parseId", () => {
  it("accepts positive integers only", () => {
    expect(parseId("12")).toBe(12);
    for (const v of ["0", "012", "-1", "1.5", "abc", "1e3", "99999999999"]) expect(parseId(v)).toBeNull();
  });
});
