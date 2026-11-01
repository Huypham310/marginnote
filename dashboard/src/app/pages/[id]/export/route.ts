import { ApiError, api } from "@/lib/api";
import { parseId } from "@/lib/ids";
import { slugify } from "@/lib/slug";

/**
 * Proxies GET /pages/:id/export.md from the API as a file download.
 * Going through the server keeps API_TOKEN out of the browser.
 */
export async function GET(_req: Request, ctx: RouteContext<"/pages/[id]/export">) {
  const id = parseId((await ctx.params).id);
  if (!id) return new Response("Not found", { status: 404 });

  try {
    // need the title for the file name, then the markdown itself
    const [page, md] = await Promise.all([api.page(id), api.exportMarkdown(id)]);
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slugify(page.title || page.domain)}.md"`,
      },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(err instanceof ApiError ? err.message : "Export failed", { status });
  }
}
