import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { ListSkeleton } from "@/components/PageCard";
import { Pagination } from "@/components/Pagination";
import { Snippet } from "@/components/Snippet";
import { api } from "@/lib/api";
import { BORDER } from "@/lib/colors";
import { first, pageNumber, plural, timeAgo } from "@/lib/format";
import { isTag } from "@/lib/tags";
import { COLORS, type Color, type Paged, type SearchHit, type TagCount } from "@/lib/types";

export const metadata: Metadata = { title: "Search" };

const PAGE_SIZE = 20;

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Search</h1>
      <Suspense fallback={<ListSkeleton />}>
        <SearchBody searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function SearchBody({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const sp = await searchParams;
  // the API answers 400 for a bad color/tag or a >200 char query; a hand-edited URL
  // shouldn't blank the whole page, so just drop what it wouldn't accept
  const q = (first(sp.q) ?? "").trim().slice(0, 200);
  const rawTag = first(sp.tag)?.toLowerCase() ?? "";
  const tag = isTag(rawTag) ? rawTag : "";
  const rawColor = first(sp.color) ?? "";
  const color = COLORS.includes(rawColor as Color) ? rawColor : "";
  const page = pageNumber(sp.page);

  let results: Paged<SearchHit>;
  let tags: TagCount[];
  try {
    [results, tags] = await Promise.all([
      api.search({ q, tag, color, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      api.tags(),
    ]);
  } catch (err) {
    return (
      <>
        <SearchForm q={q} tag={tag} color={color} tags={[]} />
        <ErrorNote error={err} />
      </>
    );
  }

  return (
    <>
      <SearchForm q={q} tag={tag} color={color} tags={tags} />
      <p className="text-sm text-slate-500">
        {plural(results.total, "highlight")}
        {q ? <> matching <span className="font-medium text-slate-700">{q}</span></> : null}
      </p>
      <ul className="mt-4 grid gap-3">
        {results.items.map((h) => (
          <li key={h.id} className={`rounded-md border-l-4 bg-white p-4 ring-1 ring-slate-200 ${BORDER[h.color]}`}>
            <p className="text-slate-800">
              {h.snippet ? <Snippet snippet={h.snippet} /> : h.text}
            </p>
            {h.note && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{h.note}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
              <Link href={`/pages/${h.pageId}`} className="font-medium text-slate-700 hover:underline">
                {h.pageTitle || h.url}
              </Link>
              {h.tags.map((t) => (
                <Link key={t} href={`/search?tag=${encodeURIComponent(t)}`} className="hover:text-slate-800">#{t}</Link>
              ))}
              <span>{timeAgo(h.createdAt)}</span>
            </div>
          </li>
        ))}
      </ul>
      {results.items.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-500">
          No highlights found. Try fewer words, or <code>&quot;quotes&quot;</code> for an exact phrase.
        </p>
      )}
      <Pagination
        basePath="/search"
        params={{ q, tag, color }}
        page={page}
        pageSize={PAGE_SIZE}
        total={results.total}
      />
    </>
  );
}

function SearchForm({ q, tag, color, tags }: { q: string; tag: string; color: string; tags: TagCount[] }) {
  const field = "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm";
  return (
    // next/form: GET submit becomes a client-side navigation to /search?q=...
    <Form action="/search" className="my-4 flex flex-wrap gap-2">
      <input
        name="q"
        defaultValue={q}
        placeholder='react hooks, "exact phrase", -class'
        aria-label="Search text"
        className={`${field} min-w-0 flex-1`}
      />
      <select name="tag" defaultValue={tag} aria-label="Tag" className={field}>
        <option value="">any tag</option>
        {tags.map((t) => (
          <option key={t.tag} value={t.tag}>
            #{t.tag} ({t.count})
          </option>
        ))}
      </select>
      <select name="color" defaultValue={color} aria-label="Color" className={field}>
        <option value="">any color</option>
        {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="rounded bg-slate-800 px-4 py-1.5 text-sm text-white">Search</button>
    </Form>
  );
}
