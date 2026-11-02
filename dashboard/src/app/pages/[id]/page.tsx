import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/PageCard";
import { PageDetailView } from "@/components/views/PageDetailView";
import { api } from "@/lib/api";
import { parseId } from "@/lib/ids";

export async function generateMetadata({ params }: PageProps<"/pages/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return {};
  const page = await api.page(id).catch(() => null);
  return { title: page ? page.title || page.domain : "Page" };
}

export default function PageView({ params }: PageProps<"/pages/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <PageDetailView params={params} />
    </Suspense>
  );
}
