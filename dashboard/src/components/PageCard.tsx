import Link from "next/link";
import { plural, timeAgo } from "@/lib/format";
import type { Page } from "@/lib/types";

export function PageCard({ page }: { page: Page }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300">
      <Link href={`/pages/${page.id}`} className="font-medium hover:underline">
        {page.title || page.url}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
        <Link href={`/?domain=${encodeURIComponent(page.domain)}`} className="hover:text-slate-800">
          {page.domain}
        </Link>
        <span>{plural(page.highlightCount, "highlight")}</span>
        <span>last {timeAgo(page.lastHighlightAt)}</span>
      </div>
      {page.summary && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{page.summary}</p>}
    </li>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="mt-4 grid gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="h-20 animate-pulse rounded-lg bg-slate-200/60" />
      ))}
    </ul>
  );
}
