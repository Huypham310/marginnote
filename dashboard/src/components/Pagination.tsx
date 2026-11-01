import Link from "next/link";

interface Props {
  /** Path without query, e.g. "/search" */
  basePath: string;
  /** Current query params; `page` gets overwritten for the prev/next links */
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}

export function hrefWith(basePath: string, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function Pagination({ basePath, params, page, pageSize, total }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1) return null;
  // page 1 không cần ?page=1 trên url
  const link = (p: number) => hrefWith(basePath, { ...params, page: p > 1 ? String(p) : undefined });
  const cls = "rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100";

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? <Link href={link(page - 1)} className={cls}>← Newer</Link> : <span />}
      <span className="text-sm text-slate-500">
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={link(page + 1)} className={cls}>Older →</Link> : <span />}
    </nav>
  );
}
