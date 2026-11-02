import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/PageCard";
import { SearchResults } from "@/components/views/SearchResults";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <section>
      <h1 className="text-xl font-semibold">Search</h1>
      <Suspense fallback={<ListSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
