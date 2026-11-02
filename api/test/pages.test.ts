import { describe, expect, it } from "vitest";
import { newHighlight, useTestApp } from "./helpers.js";

const t = useTestApp();

async function add(url: string, text = "some text", title = "") {
  const res = await t.http().post("/highlights").send(newHighlight({ url, text, title })).expect(201);
  return res.body as { id: number; pageId: number };
}

describe("GET /pages", () => {
  it("lists pages with counts, most recently highlighted first", async () => {
    await add("https://a.com/1");
    await add("https://b.com/1");
    await add("https://b.com/1");
    await add("https://a.com/2");

    const res = await t.http().get("/pages").expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((p: { url: string; highlightCount: number }) => [p.url, p.highlightCount])).toEqual([
      ["https://a.com/2", 1],
      ["https://b.com/1", 2],
      ["https://a.com/1", 1],
    ]);
  });

  it("puts pages whose highlights were all deleted last", async () => {
    const first = await add("https://a.com/1");
    await add("https://b.com/1");
    // a.com/1 was the oldest anyway; make it the newest, then empty it
    const newest = await add("https://a.com/1");
    await t.http().delete(`/highlights/${first.id}`).expect(204);
    await t.http().delete(`/highlights/${newest.id}`).expect(204);

    const res = await t.http().get("/pages").expect(200);
    expect(res.body.items.map((p: { url: string }) => p.url)).toEqual(["https://b.com/1", "https://a.com/1"]);
    expect(res.body.items[1]).toMatchObject({ highlightCount: 0, lastHighlightAt: null });
  });

  it("filters by domain and pages through results", async () => {
    for (let i = 0; i < 5; i++) await add(`https://a.com/${i}`);
    await add("https://b.com/x");

    const byDomain = await t.http().get("/pages").query({ domain: "a.com", limit: 2, offset: 2 }).expect(200);
    expect(byDomain.body).toMatchObject({ total: 5, limit: 2, offset: 2 });
    expect(byDomain.body.items.map((p: { url: string }) => p.url)).toEqual(["https://a.com/2", "https://a.com/1"]);
  });

  it("rejects bad paging params", async () => {
    await t.http().get("/pages").query({ limit: 0 }).expect(400);
    await t.http().get("/pages").query({ offset: -1 }).expect(400);
  });
});

describe("GET /pages/:id", () => {
  it("returns the page with its highlights", async () => {
    await add("https://a.com/1", "one", "Page A");
    await add("https://a.com/1", "two");
    const res = await t.http().get("/pages/1").expect(200);
    expect(res.body).toMatchObject({ id: 1, title: "Page A", highlightCount: 2, summary: null });
    expect(res.body.highlights.map((h: { text: string }) => h.text)).toEqual(["one", "two"]);
  });

  it("404s on an unknown page", async () => {
    await t.http().get("/pages/42").expect(404);
  });
});

describe("PATCH /pages/:id", () => {
  it("sets, keeps and clears the summary", async () => {
    await add("https://a.com/1", "x", "Title");
    let res = await t.http().patch("/pages/1").send({ summary: "short" }).expect(200);
    expect(res.body.summary).toBe("short");

    // only the title sent -> summary stays
    res = await t.http().patch("/pages/1").send({ title: "New title" }).expect(200);
    expect(res.body).toMatchObject({ title: "New title", summary: "short" });

    res = await t.http().patch("/pages/1").send({ summary: null }).expect(200);
    expect(res.body.summary).toBeNull();
  });

  it("validates the body and the id", async () => {
    await add("https://a.com/1");
    await t.http().patch("/pages/1").send({}).expect(400);
    await t.http().patch("/pages/1").send({ summary: "x".repeat(4001) }).expect(400);
    await t.http().patch("/pages/9").send({ title: "x" }).expect(404);
  });
});

describe("GET /pages/:id/export.md", () => {
  it("returns markdown", async () => {
    await add("https://a.com/1", "quoted text", "Page A");
    const res = await t.http().get("/pages/1/export.md").expect(200);
    expect(res.headers["content-type"]).toMatch(/^text\/markdown/);
    expect(res.text).toContain("## Page A");
    expect(res.text).toContain("> quoted text");
  });

  it("404s on an unknown page", async () => {
    await t.http().get("/pages/5/export.md").expect(404);
  });
});
