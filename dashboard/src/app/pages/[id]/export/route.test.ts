import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ page: vi.fn(), exportMarkdown: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: mocks,
}));

const call = (id: string) =>
  GET(new Request(`http://localhost/pages/${id}/export`), { params: Promise.resolve({ id }) } as never);

afterEach(() => vi.clearAllMocks());

describe("GET /pages/[id]/export", () => {
  it("downloads the markdown with a file name from the title", async () => {
    mocks.page.mockResolvedValue({ title: "React Hooks: A Guide", domain: "blog.dev" });
    mocks.exportMarkdown.mockResolvedValue("## React Hooks\n");

    const res = await call("3");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="react-hooks-a-guide.md"');
    expect(await res.text()).toBe("## React Hooks\n");
    expect(mocks.exportMarkdown).toHaveBeenCalledWith(3);
  });

  it("uses the domain when the page has no title", async () => {
    mocks.page.mockResolvedValue({ title: "", domain: "blog.dev" });
    mocks.exportMarkdown.mockResolvedValue("x");
    expect((await call("3")).headers.get("Content-Disposition")).toContain('filename="blog-dev.md"');
  });

  it("404s on a bad id without calling the API", async () => {
    expect((await call("abc")).status).toBe(404);
    expect(mocks.page).not.toHaveBeenCalled();
  });

  it("passes API errors through", async () => {
    mocks.page.mockRejectedValue(new ApiError(404, "Page not found"));
    mocks.exportMarkdown.mockRejectedValue(new ApiError(404, "Page not found"));
    const res = await call("9");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Page not found");
  });
});
