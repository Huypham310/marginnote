import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { HighlightItem } from "@/components/HighlightItem";
import { ListSkeleton } from "@/components/PageCard";
import { ApiError, api } from "@/lib/api";
import { plural } from "@/lib/format";
import { parseId } from "@/lib/ids";
import type { PageDetail } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/pages/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return {};
  const page = await api.page(id).catch(() => null);
  return { title: page ? page.title || page.domain : "Page" };
}

export default function PageView({ params }: PageProps<"/pages/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <PageBody params={params} />
    </Suspense>
  );
}

async function PageBody({ params }: Pick<PageProps<"/pages/[id]">, "params">) {
  const id = parseId((await params).id);
  if (!id) notFound();

  let page: PageDetail;
  try {
    page = await api.page(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    return <ErrorNote error={err} />;
  }

  return (
    <article>
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Library</Link>
      <h1 className="mt-2 text-xl font-semibold">{page.title || page.url}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
        <a href={page.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          {page.domain} ↗
        </a>
        <span>{plural(page.highlightCount, "highlight")}</span>
        <a href={`/pages/${page.id}/export`} className="hover:text-slate-800">Export .md</a>
      </div>

      {page.summary && (
        <section className="mt-4 rounded-lg bg-white p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Summary</h2>
          {page.summary}
        </section>
      )}

      <ul className="mt-6 grid gap-4">
        {page.highlights.map((h) => <HighlightItem key={h.id} h={h} />)}
      </ul>
      {page.highlights.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">No highlights left on this page.</p>
      )}
    </article>
  );
}
