import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { sizeClass } from "@/lib/tags";
import type { TagCount } from "@/lib/types";

export const metadata: Metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Tags</h1>
      <Suspense fallback={<div className="mt-4 h-24 animate-pulse rounded-lg bg-slate-200/60" />}>
        <TagCloud />
      </Suspense>
    </section>
  );
}

async function TagCloud() {
  let tags: TagCount[];
  try {
    tags = await api.tags();
  } catch (err) {
    return <div className="mt-4"><ErrorNote error={err} /></div>;
  }
  if (tags.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No tags yet. Add some from the extension popup or a page view.</p>;
  }

  const counts = tags.map((t) => t.count);
  const [min, max] = [Math.min(...counts), Math.max(...counts)];
  // API sorts by count; alphabetical reads better in a cloud
  const sorted = [...tags].sort((a, b) => a.tag.localeCompare(b.tag));
  return (
    <>
      <p className="mt-1 text-sm text-slate-500">{plural(tags.length, "tag")}</p>
      <ul className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-3 rounded-lg bg-white p-6 ring-1 ring-slate-200">
        {sorted.map((t) => (
          <li key={t.tag}>
            <Link
              href={`/search?tag=${encodeURIComponent(t.tag)}`}
              title={plural(t.count, "highlight")}
              className={`${sizeClass(t.count, min, max)} text-slate-700 hover:text-blue-600`}
            >
              #{t.tag}
            </Link>
            <span className="ml-1 text-xs text-slate-400">{t.count}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
