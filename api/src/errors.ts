import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

/** Error with an HTTP status; anything else that reaches the handler becomes a 500. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`));
};

// Express 5 forwards rejected promises from async handlers here, so routes can just throw
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request",
      // chỉ trả field + message, không lộ cả object zod ra ngoài
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // body-parser sets type "entity.parse.failed" on malformed JSON
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
