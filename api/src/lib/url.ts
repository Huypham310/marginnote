// Query params that only track where a click came from; they don't change the page content,
// so keeping them would store the same article under many different urls.
const TRACKING_PARAMS = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^mc_(cid|eid)$/i, /^ref$/i, /^ref_src$/i];

/**
 * Canonical form of a page url used as the `pages.url` key:
 * lowercase host, no "www.", no #fragment, no tracking params, sorted query, no trailing slash.
 */
export function normalizeUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`unsupported protocol: ${url.protocol}`);
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.some((re) => re.test(key)))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(kept).toString();

  let out = url.toString();
  // "https://a.com/x/" và "https://a.com/x" là cùng một trang
  if (url.pathname !== "/" && out.endsWith("/") && !url.search) out = out.slice(0, -1);
  return out;
}

export function domainOf(normalizedUrl: string): string {
  return new URL(normalizedUrl).hostname;
}
