import { describe, expect, it } from "vitest";
import { first, pageNumber, plural, timeAgo } from "./format";

const now = new Date("2026-11-01T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;

describe("timeAgo", () => {
  it.each([
    [ago(20_000), "just now"],
    [ago(5 * MIN), "5 min ago"],
    [ago(3 * 60 * MIN), "3 h ago"],
    [ago(30 * 60 * MIN), "yesterday"],
    [ago(4 * 24 * 60 * MIN), "4 days ago"],
  ])("%s -> %s", (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });

  it("shows a date for older items, with the year only when it differs", () => {
    expect(timeAgo("2026-09-15T12:00:00Z", now)).toBe("Sep 15");
    expect(timeAgo("2025-09-15T12:00:00Z", now)).toBe("Sep 15, 2025");
  });

  it("handles a missing date", () => {
    expect(timeAgo(null, now)).toBe("never");
  });
});

describe("plural", () => {
  it("adds an s except for one", () => {
    expect(plural(0, "page")).toBe("0 pages");
    expect(plural(1, "page")).toBe("1 page");
    expect(plural(2, "page")).toBe("2 pages");
  });
});

describe("search param helpers", () => {
  it("first() takes the first of repeated params", () => {
    expect(first(["a", "b"])).toBe("a");
    expect(first("a")).toBe("a");
    expect(first(undefined)).toBeUndefined();
  });

  it("pageNumber() falls back to 1 for junk", () => {
    expect(pageNumber("3")).toBe(3);
    for (const v of ["0", "-2", "1.5", "abc", undefined]) expect(pageNumber(v)).toBe(1);
  });
});
