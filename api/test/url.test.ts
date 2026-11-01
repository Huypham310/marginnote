import { describe, expect, it } from "vitest";
import { domainOf, normalizeUrl } from "../src/lib/url.js";

describe("normalizeUrl", () => {
  it.each([
    ["https://WWW.Example.com/Post", "https://example.com/Post"],
    ["https://example.com/post/", "https://example.com/post"],
    ["https://example.com/post///", "https://example.com/post"],
    ["https://example.com/post#section-2", "https://example.com/post"],
    ["https://example.com/", "https://example.com/"],
    ["https://example.com", "https://example.com/"],
    // tracking params go, real ones stay and get sorted
    ["https://example.com/p?utm_source=x&b=2&a=1&fbclid=abc", "https://example.com/p?a=1&b=2"],
    ["https://example.com/p?UTM_Campaign=x&gclid=1&ref=hn", "https://example.com/p"],
    ["https://example.com/p/?id=7", "https://example.com/p?id=7"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it("keeps the path case (paths are case sensitive on most servers)", () => {
    expect(normalizeUrl("https://example.com/README")).not.toBe(normalizeUrl("https://example.com/readme"));
  });

  it("maps the same article from different links to one url", () => {
    const variants = [
      "https://www.blog.dev/posts/hooks?utm_medium=social",
      "https://blog.dev/posts/hooks/#comments",
      "https://BLOG.dev/posts/hooks?fbclid=xyz",
    ];
    expect(new Set(variants.map(normalizeUrl)).size).toBe(1);
  });

  it("rejects non-http urls", () => {
    expect(() => normalizeUrl("chrome://extensions")).toThrow(/unsupported protocol/);
    expect(() => normalizeUrl("file:///C:/notes.html")).toThrow(/unsupported protocol/);
  });

  it("throws on garbage", () => {
    expect(() => normalizeUrl("not a url")).toThrow();
  });
});

describe("domainOf", () => {
  it("returns the host without port", () => {
    expect(domainOf("https://example.com/a")).toBe("example.com");
    expect(domainOf("http://localhost:8080/a")).toBe("localhost");
  });
});
