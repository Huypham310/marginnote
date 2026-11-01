"use server";

import { refresh } from "next/cache";
import { ApiError, api } from "@/lib/api";
import { parseTags } from "@/lib/tags";
import { COLORS, type Color } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Server actions are plain POST endpoints, so don't trust the arguments just because our UI sent them.
function validId(id: unknown): id is number {
  return Number.isInteger(id) && (id as number) > 0;
}

function fail(err: unknown): ActionResult {
  return { ok: false, error: err instanceof ApiError ? err.message : "Something went wrong" };
}

export async function updateHighlight(
  id: number,
  patch: { note?: string; color?: string; tags?: string },
): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: "Bad highlight id" };

  const body: { note?: string; color?: Color; tags?: string[] } = {};
  if (typeof patch.note === "string") {
    if (patch.note.length > 10_000) return { ok: false, error: "Note is too long (10k chars max)" };
    body.note = patch.note;
  }
  if (patch.color !== undefined) {
    if (!COLORS.includes(patch.color as Color)) return { ok: false, error: "Unknown color" };
    body.color = patch.color as Color;
  }
  if (typeof patch.tags === "string") {
    const parsed = parseTags(patch.tags);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    body.tags = parsed.tags;
  }
  if (Object.keys(body).length === 0) return { ok: false, error: "Nothing to update" };

  try {
    await api.updateHighlight(id, body);
  } catch (err) {
    return fail(err);
  }
  // re-render the page in the same response so the list shows the new values
  refresh();
  return { ok: true };
}

export async function deleteHighlight(id: number): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: "Bad highlight id" };
  try {
    await api.deleteHighlight(id);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}
