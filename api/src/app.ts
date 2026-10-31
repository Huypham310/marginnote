import cors from "cors";
import express, { type RequestHandler } from "express";
import type pg from "pg";
import { errorHandler, HttpError, notFound } from "./errors.js";
import { makeRepo } from "./repo.js";
import { makeRouter } from "./routes.js";

export interface AppOptions {
  pool: pg.Pool;
  /** When set, every route except /health needs `Authorization: Bearer <token>`. */
  apiToken?: string;
}

function requireToken(token: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.get("authorization") ?? "";
    if (header !== `Bearer ${token}`) {
      next(new HttpError(401, "Missing or wrong API token"));
      return;
    }
    next();
  };
}

/** App factory so tests can pass their own pool and token. */
export function createApp({ pool, apiToken }: AppOptions) {
  const app = express();
  // extension requests come from chrome-extension://<id>, the dashboard from localhost:3000
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: true });
    } catch {
      res.status(503).json({ status: "degraded", database: false });
    }
  });

  if (apiToken) app.use(requireToken(apiToken));
  app.use(makeRouter(makeRepo(pool)));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
