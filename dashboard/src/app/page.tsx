import { Suspense } from "react";
import { ListSkeleton } from "@/components/PageCard";
import { LibraryList } from "@/components/views/LibraryList";

export default function LibraryPage({ searchParams }: PageProps<"/">) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Library</h1>
      {/* searchParams is request data, so with cacheComponents it has to sit inside Suspense */}
      <Suspense fallback={<ListSkeleton />}>
        <LibraryList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
