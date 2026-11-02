import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { deleteHighlight, updateHighlight } from "./actions";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { updateHighlight: mocks.updateHighlight, deleteHighlight: mocks.deleteHighlight },
}));

afterEach(() => vi.clearAllMocks());

describe("updateHighlight action", () => {
  it("parses tags, calls the API and refreshes the page", async () => {
    mocks.updateHighlight.mockResolvedValue({});
    const res = await updateHighlight(3, { note: "n", tags: "#React, ml" });
    expect(res).toEqual({ ok: true });
    expect(mocks.updateHighlight).toHaveBeenCalledWith(3, { note: "n", tags: ["react", "ml"] });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ["a bad id", -1, { note: "x" }, "Bad highlight id"],
    ["a non-integer id", 1.5, { note: "x" }, "Bad highlight id"],
    ["an unknown color", 1, { color: "orange" }, "Unknown color"],
    ["a huge note", 1, { note: "x".repeat(10_001) }, "Note is too long (10k chars max)"],
    ["nothing to change", 1, {}, "Nothing to update"],
  ])("rejects %s without calling the API", async (_name, id, patch, error) => {
    expect(await updateHighlight(id, patch)).toEqual({ ok: false, error });
    expect(mocks.updateHighlight).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("passes the tag error through", async () => {
    const res = await updateHighlight(1, { tags: "c++" });
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining("c++") });
  });

  it("returns API errors instead of throwing", async () => {
    mocks.updateHighlight.mockRejectedValue(new ApiError(404, "Highlight not found"));
    expect(await updateHighlight(1, { color: "blue" })).toEqual({ ok: false, error: "Highlight not found" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("doesn't leak unexpected error messages", async () => {
    mocks.updateHighlight.mockRejectedValue(new Error("socket hang up at 10.0.0.5"));
    expect(await updateHighlight(1, { color: "blue" })).toEqual({ ok: false, error: "Something went wrong" });
  });
});

describe("deleteHighlight action", () => {
  it("deletes and refreshes", async () => {
    mocks.deleteHighlight.mockResolvedValue(undefined);
    expect(await deleteHighlight(4)).toEqual({ ok: true });
    expect(mocks.deleteHighlight).toHaveBeenCalledWith(4);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("validates the id and reports API errors", async () => {
    expect(await deleteHighlight(0)).toEqual({ ok: false, error: "Bad highlight id" });
    mocks.deleteHighlight.mockRejectedValue(new ApiError(404, "Highlight not found"));
    expect(await deleteHighlight(4)).toEqual({ ok: false, error: "Highlight not found" });
  });
});
