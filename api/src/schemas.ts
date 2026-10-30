import { z } from "zod";

export const COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;

const tag = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "tags are lowercase letters, digits and dashes");

// W3C TextQuoteSelector: enough context to find the passage again after the page re-renders
export const anchorSchema = z.object({
  exact: z.string().min(1).max(5000),
  prefix: z.string().max(200).default(""),
  suffix: z.string().max(200).default(""),
});

export const createHighlightSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  title: z.string().max(500).default(""),
  text: z.string().trim().min(1).max(5000),
  note: z.string().max(10_000).default(""),
  color: z.enum(COLORS).default("yellow"),
  anchor: anchorSchema,
  tags: z.array(tag).max(10).default([]),
});

export const updateHighlightSchema = z
  .object({
    note: z.string().max(10_000),
    color: z.enum(COLORS),
    tags: z.array(tag).max(10),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "nothing to update");

export const updatePageSchema = z
  .object({
    title: z.string().max(500),
    // summary comes from the in-browser model, so cap it to keep rows small
    summary: z.string().max(4000).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "nothing to update");

export const pagingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listPagesSchema = pagingSchema.extend({
  domain: z.string().optional(),
});

export const searchSchema = pagingSchema.extend({
  q: z.string().trim().max(200).default(""),
  tag: tag.optional(),
  color: z.enum(COLORS).optional(),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export type CreateHighlight = z.infer<typeof createHighlightSchema>;
export type UpdateHighlight = z.infer<typeof updateHighlightSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;
