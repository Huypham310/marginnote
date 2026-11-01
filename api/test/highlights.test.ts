import { describe, expect, it } from "vitest";
import { newHighlight, useTestApp } from "./helpers.js";

const t = useTestApp();

describe("POST /highlights", () => {
  it("creates the page from the url and returns the highlight", async () => {
    const res = await t.http().post("/highlights").send(newHighlight({ tags: ["ML"] })).expect(201);
    expect(res.body).toMatchObject({
      id: 1,
      pageId: 1,
      text: "the quick brown fox",
      color: "yellow",
      tags: ["ml"],
      url: "https://example.com/article",
    });
    const { rows } = await t.pool().query("SELECT url, domain, title FROM pages");
    expect(rows).toEqual([{ url: "https://example.com/article", domain: "example.com", title: "An article" }]);
  });

  it("puts highlights from url variants on the same page", async () => {
    await t.http().post("/highlights").send(newHighlight()).expect(201);
    const res = await t
      .http()
      .post("/highlights")
      .send(newHighlight({ url: "https://www.example.com/article/?utm_source=x#top" }))
      .expect(201);
    expect(res.body.pageId).toBe(1);
  });

  it("updates the page title but never blanks it", async () => {
    await t.http().post("/highlights").send(newHighlight()).expect(201);
    await t.http().post("/highlights").send(newHighlight({ title: "" })).expect(201);
    let { rows } = await t.pool().query("SELECT title FROM pages");
    expect(rows[0].title).toBe("An article");

    await t.http().post("/highlights").send(newHighlight({ title: "Renamed" })).expect(201);
    ({ rows } = await t.pool().query("SELECT title FROM pages"));
    expect(rows[0].title).toBe("Renamed");
  });

  it("returns 400 with the failing fields", async () => {
    const res = await t
      .http()
      .post("/highlights")
      .send(newHighlight({ color: "orange", text: "" }))
      .expect(400);
    expect(res.body.error).toBe("Invalid request");
    expect(res.body.issues.map((i: { path: string }) => i.path).sort()).toEqual(["color", "text"]);
  });

  it("returns 400 on malformed json", async () => {
    const res = await t.http().post("/highlights").set("Content-Type", "application/json").send("{oops").expect(400);
    expect(res.body.error).toBe("Malformed JSON body");
  });

  it("returns 413 for huge bodies", async () => {
    const res = await t
      .http()
      .post("/highlights")
      .send(newHighlight({ note: "x".repeat(300_000) }))
      .expect(413);
    expect(res.body.error).toMatch(/too large/);
  });

  it("doesn't leave a page behind when the highlight insert fails", async () => {
    // zod is fine with \u0000 but postgres jsonb rejects it, so the 2nd insert fails after the page insert
    const res = await t
      .http()
      .post("/highlights")
      .send(newHighlight({ anchor: { exact: "a\u0000b", prefix: "", suffix: "" } }));
    expect(res.status).toBe(500);
    const { rows } = await t.pool().query("SELECT count(*)::int AS n FROM pages");
    expect(rows[0].n).toBe(0);
  });
});

describe("GET /highlights?url=", () => {
  it("lists highlights for any variant of the page url, oldest first", async () => {
    await t.http().post("/highlights").send(newHighlight({ text: "one" })).expect(201);
    await t.http().post("/highlights").send(newHighlight({ text: "two" })).expect(201);
    await t.http().post("/highlights").send(newHighlight({ url: "https://other.com/", text: "elsewhere" }));

    const res = await t.http().get("/highlights").query({ url: "https://WWW.example.com/article#x" }).expect(200);
    expect(res.body.map((h: { text: string }) => h.text)).toEqual(["one", "two"]);
  });

  it("returns [] for a page we've never seen", async () => {
    const res = await t.http().get("/highlights").query({ url: "https://new.com/" }).expect(200);
    expect(res.body).toEqual([]);
  });

  it("needs a valid url", async () => {
    await t.http().get("/highlights").expect(400);
    await t.http().get("/highlights").query({ url: "nope" }).expect(400);
  });
});

describe("PATCH /highlights/:id", () => {
  it("changes only the fields that were sent", async () => {
    await t.http().post("/highlights").send(newHighlight({ note: "keep me", tags: ["a"] })).expect(201);
    const res = await t.http().patch("/highlights/1").send({ color: "green" }).expect(200);
    expect(res.body).toMatchObject({ color: "green", note: "keep me", tags: ["a"] });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(res.body.createdAt).getTime());
  });

  it("can clear the note and tags", async () => {
    await t.http().post("/highlights").send(newHighlight({ note: "x", tags: ["a"] })).expect(201);
    const res = await t.http().patch("/highlights/1").send({ note: "", tags: [] }).expect(200);
    expect(res.body).toMatchObject({ note: "", tags: [] });
  });

  it("400 on an empty patch, 404 on an unknown id", async () => {
    await t.http().post("/highlights").send(newHighlight()).expect(201);
    await t.http().patch("/highlights/1").send({}).expect(400);
    await t.http().patch("/highlights/999").send({ note: "x" }).expect(404);
    await t.http().patch("/highlights/abc").send({ note: "x" }).expect(400);
  });
});

describe("DELETE /highlights/:id", () => {
  it("deletes once, then 404", async () => {
    await t.http().post("/highlights").send(newHighlight()).expect(201);
    await t.http().delete("/highlights/1").expect(204);
    await t.http().delete("/highlights/1").expect(404);
  });
});

describe("unknown routes", () => {
  it("return a json 404", async () => {
    const res = await t.http().get("/nope").expect(404);
    expect(res.body.error).toBe("No route for GET /nope");
  });
});
