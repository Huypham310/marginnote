import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ErrorNote } from "./ErrorNote";
import { ActiveNavLink } from "./NavLink";
import { ListSkeleton, PageCard } from "./PageCard";

const nav = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
import { Pagination, hrefWith } from "./Pagination";
import { Snippet } from "./Snippet";

afterEach(cleanup);

describe("Snippet", () => {
  it("renders matches as <mark> and everything else as text", () => {
    const { container } = render(
      <p>
        <Snippet snippet={'<img src=x onerror="alert(1)"> said <mark>hello</mark>'} />
      </p>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("mark")?.textContent).toBe("hello");
    expect(container.textContent).toBe('<img src=x onerror="alert(1)"> said hello');
  });
});

describe("Pagination", () => {
  it("builds hrefs without empty params", () => {
    expect(hrefWith("/search", { q: "a b", tag: undefined, page: "2" })).toBe("/search?q=a+b&page=2");
    expect(hrefWith("/", {})).toBe("/");
  });

  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination basePath="/" params={{}} page={1} pageSize={20} total={20} />);
    expect(container.innerHTML).toBe("");
  });

  it("links to the neighbours and keeps the filters (no ?page=1)", () => {
    render(<Pagination basePath="/search" params={{ q: "x" }} page={2} pageSize={10} total={35} />);
    expect(screen.getByText("Page 2 of 4")).toBeTruthy();
    expect(screen.getByRole("link", { name: "← Newer" }).getAttribute("href")).toBe("/search?q=x");
    expect(screen.getByRole("link", { name: "Older →" }).getAttribute("href")).toBe("/search?q=x&page=3");
  });

  it("hides 'Older' on the last page", () => {
    render(<Pagination basePath="/" params={{}} page={4} pageSize={10} total={35} />);
    expect(screen.queryByRole("link", { name: "Older →" })).toBeNull();
  });
});

describe("PageCard", () => {
  it("falls back to the url and links the domain filter", () => {
    render(
      <ul>
        <PageCard
          page={{
            id: 3,
            url: "https://a.com/x",
            domain: "a.com",
            title: "",
            summary: "A short summary",
            highlightCount: 1,
            lastHighlightAt: null,
          }}
        />
      </ul>,
    );
    expect(screen.getByRole("link", { name: "https://a.com/x" }).getAttribute("href")).toBe("/pages/3");
    expect(screen.getByRole("link", { name: "a.com" }).getAttribute("href")).toBe("/?domain=a.com");
    expect(screen.getByText("1 highlight")).toBeTruthy();
    expect(screen.getByText("A short summary")).toBeTruthy();
  });
});

describe("ActiveNavLink", () => {
  it.each([
    ["/", "/", true],
    ["/pages/3", "/", true],
    ["/search", "/", false],
    ["/search", "/search", true],
    ["/tags", "/search", false],
  ])("on %s the %s link active=%s", (path, href, active) => {
    nav.path = path;
    render(<ActiveNavLink href={href} label="x" />);
    expect(screen.getByRole("link").getAttribute("aria-current")).toBe(active ? "page" : null);
  });
});

describe("ListSkeleton", () => {
  it("renders the requested number of rows", () => {
    const { container } = render(<ListSkeleton rows={3} />);
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });
});

describe("ErrorNote", () => {
  it("shows API messages but hides other errors", () => {
    const { rerender } = render(<ErrorNote error={new ApiError(503, "Can't reach the API")} />);
    expect(screen.getByRole("alert").textContent).toBe("Can't reach the API");
    rerender(<ErrorNote error={new Error("pg password is hunter2")} />);
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong");
  });
});
