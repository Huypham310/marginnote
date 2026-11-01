/** Route ids come from the URL, so "abc" or "1.5" shouldn't even reach the API. */
export function parseId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}
