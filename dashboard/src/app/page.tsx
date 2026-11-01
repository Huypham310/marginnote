import Link from "next/link";
import { Suspense } from "react";
import { ErrorNote } from "@/components/ErrorNote";
import { ListSkeleton, PageCard } from "@/components/PageCard";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { first, pageNumber, plural } from "@/lib/format";
import type { Page, Paged } from "@/lib/types";

const PAGE_SIZE = 20;

export default function LibraryPage({ searchParams }: PageProps<"/">) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Library</h1>
      {/* searchParams is request data, so with cacheComponents it has to sit inside Suspense */}
      <Suspense fallback={<ListSkeleton />}>
        <PageList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function PageList({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const page = pageNumber(sp.page);
  const domain = first(sp.domain);

  let data: Paged<Page>;
  try {
    data = await api.pages({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, domain });
  } catch (err) {
    return <div className="mt-4"><ErrorNote error={err} /></div>;
  }

  return (
    <>
      <p className="mt-1 text-sm text-slate-500">
        {plural(data.total, "page")}
        {domain && (
          <>
            {" "}from <span className="font-medium text-slate-700">{domain}</span> ·{" "}
            <Link href="/" className="text-blue-600 hover:underline">show all</Link>
          </>
        )}
      </p>
      {data.items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          Nothing here yet. Highlight something with the extension and it will show up here.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {data.items.map((p) => <PageCard key={p.id} page={p} />)}
        </ul>
      )}
      <Pagination basePath="/" params={{ domain }} page={page} pageSize={PAGE_SIZE} total={data.total} />
    </>
  );
}
