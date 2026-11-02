import type { Metadata } from "next";
import { Suspense } from "react";
import { TagCloud } from "@/components/views/TagCloud";

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
