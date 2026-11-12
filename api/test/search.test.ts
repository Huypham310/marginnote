import { beforeEach, describe, expect, it } from "vitest";
import { newHighlight, useTestApp } from "./helpers.js";

const t = useTestApp();

interface Hit {
  text: string;
  snippet: string | null;
  pageTitle: string;
  url: string;
}
const texts = (body: { items: Hit[] }) => body.items.map((h) => h.text);

beforeEach(async () => {
  // order matters for the "newest first" test
  const rows = [
    { text: "Postgres indexes make lookups fast", tags: ["postgres"], color: "yellow" },
    { text: "Something unrelated", note: "remember the postgres docs", tags: ["todo"], color: "green" },
    { text: "React hooks run on every render", tags: ["react"], color: "blue" },
    { text: "The quick brown fox jumps", tags: ["react", "todo"], color: "blue" },
  ];
  for (const r of rows) {
    await t.http().post("/highlights").send(newHighlight({ ...r, title: "Notes" })).expect(201);
  }
});

describe("GET /search", () => {
  it("ranks a match in the highlight text above a match in the note", async () => {
    const res = await t.http().get("/search").query({ q: "postgres" }).expect(200);
    expect(texts(res.body)).toEqual(["Postgres indexes make lookups fast", "Something unrelated"]);
    expect(res.body.total).toBe(2);
  });

  it("marks matches in the snippet (stemmed: 'indexing' finds 'indexes')", async () => {
    const res = await t.http().get("/search").query({ q: "indexing" }).expect(200);
    expect(res.body.items[0].snippet).toContain("<mark>indexes</mark>");
    expect(res.body.items[0]).toMatchObject({ pageTitle: "Notes", url: "https://example.com/article" });
  });

  it("finds highlights by tag, ranked below text matches", async () => {
    // "todo" only appears as a tag: before tags were indexed this found nothing
    const tagOnly = await t.http().get("/search").query({ q: "todo" }).expect(200);
    expect(texts(tagOnly.body).sort()).toEqual(["Something unrelated", "The quick brown fox jumps"]);

    // both rows are tagged react, only one says it in the text: that one ranks first
    const react = await t.http().get("/search").query({ q: "react" }).expect(200);
    expect(texts(react.body)).toEqual([
      "React hooks run on every render",
      "The quick brown fox jumps",
    ]);
  });

  it("re-indexes a highlight when its tags change", async () => {
    const created = await t
      .http()
      .post("/highlights")
      .send(newHighlight({ text: "Plain sentence", tags: [], title: "Notes" }))
      .expect(201);
    expect((await t.http().get("/search").query({ q: "kubernetes" })).body.total).toBe(0);
    await t.http().patch(`/highlights/${created.body.id}`).send({ tags: ["kubernetes"] }).expect(200);
    const res = await t.http().get("/search").query({ q: "kubernetes" }).expect(200);
    expect(texts(res.body)).toEqual(["Plain sentence"]);
  });

  it("understands web-search syntax", async () => {
    const neg = await t.http().get("/search").query({ q: "postgres -indexes" }).expect(200);
    expect(texts(neg.body)).toEqual(["Something unrelated"]);

    const phrase = await t.http().get("/search").query({ q: '"brown fox"' }).expect(200);
    expect(texts(phrase.body)).toEqual(["The quick brown fox jumps"]);
    const wrongOrder = await t.http().get("/search").query({ q: '"fox brown"' }).expect(200);
    expect(wrongOrder.body.total).toBe(0);
  });

  it("filters by tag and color, also combined with a query", async () => {
    const tag = await t.http().get("/search").query({ tag: "react" }).expect(200);
    expect(tag.body.total).toBe(2);

    const both = await t.http().get("/search").query({ tag: "todo", color: "blue" }).expect(200);
    expect(texts(both.body)).toEqual(["The quick brown fox jumps"]);

    const withQ = await t.http().get("/search").query({ q: "hooks", tag: "react" }).expect(200);
    expect(texts(withQ.body)).toEqual(["React hooks run on every render"]);
  });

  it("returns everything newest first without a query, and pages", async () => {
    const all = await t.http().get("/search").expect(200);
    expect(all.body.total).toBe(4);
    expect(all.body.items[0]).toMatchObject({ text: "The quick brown fox jumps", snippet: null });

    const page2 = await t.http().get("/search").query({ limit: 2, offset: 2 }).expect(200);
    expect(texts(page2.body)).toEqual(["Something unrelated", "Postgres indexes make lookups fast"]);
    expect(page2.body.total).toBe(4);
  });

  it("doesn't choke on punctuation-only queries", async () => {
    const res = await t.http().get("/search").query({ q: "!!! & |" }).expect(200);
    expect(res.body.total).toBe(0);
  });

  it("rejects bad filters", async () => {
    await t.http().get("/search").query({ color: "orange" }).expect(400);
    await t.http().get("/search").query({ tag: "two words" }).expect(400);
    await t.http().get("/search").query({ q: "x".repeat(201) }).expect(400);
  });
});

describe("GET /tags", () => {
  it("counts tags, most used first then by name", async () => {
    const res = await t.http().get("/tags").expect(200);
    expect(res.body).toEqual([
      { tag: "react", count: 2 },
      { tag: "todo", count: 2 },
      { tag: "postgres", count: 1 },
    ]);
  });
});
