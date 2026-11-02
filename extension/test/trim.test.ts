import { describe, expect, it } from "vitest";
import { trimInput } from "../src/popup/trim";

describe("trimInput", () => {
  it("leaves short text alone", () => {
    expect(trimInput("Short page.", 100)).toEqual({ input: "Short page.", truncated: false });
  });

  it("cuts at the last full sentence inside the limit", () => {
    const text = "First sentence here. Second one is here. Third one goes past the limit.";
    const { input, truncated } = trimInput(text, 50);
    expect(input).toBe("First sentence here. Second one is here.");
    expect(truncated).toBe(true);
  });

  it("keeps the whole budget when there is no sentence end (code, lists)", () => {
    const text = "x".repeat(200);
    expect(trimInput(text, 100).input).toHaveLength(100);
  });

  it("doesn't throw away most of the text for one early full stop", () => {
    // the only ". " is at char 10, cutting there would keep 11 of 100 chars
    const text = "Hi there. " + "word ".repeat(40);
    expect(trimInput(text, 100).input).toHaveLength(100);
  });
});
