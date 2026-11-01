// same rules as the API's tag schema (api/src/schemas.ts)
const TAG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const MAX_TAGS = 10;

export function isTag(s: string): boolean {
  return s.length <= 32 && TAG_RE.test(s);
}

// 4 font sizes are plenty for a personal tag cloud
const SIZES = ["text-sm", "text-base", "text-lg", "text-2xl"];

/**
 * Maps a tag count onto SIZES, linear between the smallest and biggest count.
 * Not log scale: personal tag counts sit close together (7..15) and log makes them all huge.
 */
export function sizeClass(count: number, min: number, max: number): string {
  if (max <= min) return SIZES[1];
  const t = (count - min) / (max - min);
  return SIZES[Math.min(SIZES.length - 1, Math.floor(t * SIZES.length))];
}

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
    if (!isTag(t)) return { error: `"${raw}" isn't a valid tag (letters, digits, dashes)` };
    if (!tags.includes(t)) tags.push(t);
  }
  if (tags.length > MAX_TAGS) return { error: `At most ${MAX_TAGS} tags` };
  return { tags };
}
