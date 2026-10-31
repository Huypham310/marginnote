import type { Highlight, Page } from "./repo.js";

/** Renders one page and its highlights as Markdown (blockquote per highlight, note below). */
export function pageToMarkdown(page: Page & { highlights: Highlight[] }): string {
  const lines = [`## ${page.title || page.url}`, "", `<${page.url}>`, ""];
  if (page.summary) lines.push(`**Summary:** ${page.summary}`, "");
  for (const h of page.highlights) {
    // mỗi dòng của đoạn trích đều phải có "> " thì markdown mới hiểu là quote
    lines.push(...h.text.split(/\r?\n/).map((l) => `> ${l}`));
    if (h.note) lines.push("", h.note);
    if (h.tags.length) lines.push("", h.tags.map((t) => `#${t}`).join(" "));
    lines.push("");
  }
  return lines.join("\n");
}
