/** Turns a page title into a safe file name for the markdown download. */
export function slugify(title: string, fallback = "page"): string {
  const s = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu: "Tiếng Việt" -> "Tieng Viet"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || fallback;
}
