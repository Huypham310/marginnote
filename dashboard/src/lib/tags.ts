// same rules as the API's tag schema (api/src/schemas.ts)
const TAG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const MAX_TAGS = 10;

/**
 * Parses what the user typed in the tags box ("React, ml  #todo") into API tags.
 * Returns an error string instead of throwing so the form can show it.
 */
export function parseTags(input: string): { tags: string[] } | { error: string } {
  const tags: string[] = [];
  for (const raw of input.split(/[,\s]+/)) {
    // people type "#tag" out of habit, strip it
    const t = raw.replace(/^#/, "").trim().toLowerCase();
    if (!t) continue;
    if (t.length > 32 || !TAG_RE.test(t)) return { error: `"${raw}" isn't a valid tag (letters, digits, dashes)` };
    if (!tags.includes(t)) tags.push(t);
  }
  if (tags.length > MAX_TAGS) return { error: `At most ${MAX_TAGS} tags` };
  return { tags };
}
