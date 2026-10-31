import { Router } from "express";
import { z } from "zod";
import { HttpError } from "./errors.js";
import { pageToMarkdown } from "./export.js";
import type { Repo } from "./repo.js";
import {
  createHighlightSchema,
  idParam,
  listPagesSchema,
  searchSchema,
  updateHighlightSchema,
  updatePageSchema,
} from "./schemas.js";

export function makeRouter(repo: Repo): Router {
  const r = Router();

  // --- highlights (used by the extension) ---

  r.post("/highlights", async (req, res) => {
    const body = createHighlightSchema.parse(req.body);
    res.status(201).json(await repo.createHighlight(body));
  });

  // highlights for the page the user is looking at, so the extension can repaint them
  r.get("/highlights", async (req, res) => {
    const { url } = z.object({ url: z.url() }).parse(req.query);
    res.json(await repo.highlightsForUrl(url));
  });

  r.patch("/highlights/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const updated = await repo.updateHighlight(id, updateHighlightSchema.parse(req.body));
    if (!updated) throw new HttpError(404, "Highlight not found");
    res.json(updated);
  });

  r.delete("/highlights/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deleteHighlight(id))) throw new HttpError(404, "Highlight not found");
    res.status(204).end();
  });

  // --- pages + search (used by the dashboard) ---

  r.get("/pages", async (req, res) => {
    res.json(await repo.listPages(listPagesSchema.parse(req.query)));
  });

  r.get("/pages/:id", async (req, res) => {
    const page = await repo.getPage(idParam.parse(req.params).id);
    if (!page) throw new HttpError(404, "Page not found");
    res.json(page);
  });

  r.patch("/pages/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const page = await repo.updatePage(id, updatePageSchema.parse(req.body));
    if (!page) throw new HttpError(404, "Page not found");
    res.json(page);
  });

  r.get("/pages/:id/export.md", async (req, res) => {
    const page = await repo.getPage(idParam.parse(req.params).id);
    if (!page) throw new HttpError(404, "Page not found");
    res.type("text/markdown").send(pageToMarkdown(page));
  });

  r.get("/search", async (req, res) => {
    res.json(await repo.search(searchSchema.parse(req.query)));
  });

  r.get("/tags", async (_req, res) => {
    res.json(await repo.tags());
  });

  return r;
}
