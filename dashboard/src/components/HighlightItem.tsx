"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { type ActionResult, deleteHighlight, updateHighlight } from "@/app/pages/[id]/actions";
import { BORDER, SWATCH } from "@/lib/colors";
import { timeAgo } from "@/lib/format";
import { COLORS, type Highlight } from "@/lib/types";

/** One highlight on the page view: quote, note, tags, plus inline edit / recolor / delete. */
export function HighlightItem({ h }: { h: Highlight }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(h.note);
  const [tags, setTags] = useState(h.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) after?.();
      else setError(res.error);
    });
  }

  function cancel() {
    // bỏ những gì đang gõ dở, quay về giá trị đã lưu
    setNote(h.note);
    setTags(h.tags.join(", "));
    setEditing(false);
    setError(null);
  }

  return (
    <li
      className={`rounded-md border-l-4 bg-white p-4 ring-1 ring-slate-200 ${BORDER[h.color]} ${pending ? "opacity-60" : ""}`}
    >
      <blockquote className="whitespace-pre-line text-slate-800">{h.text}</blockquote>

      {editing ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateHighlight(h.id, { note, tags }), () => setEditing(false));
          }}
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            aria-label="Note"
            rows={3}
            className="rounded border border-slate-300 p-2 text-sm"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma separated"
            aria-label="Tags"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded bg-slate-800 px-3 py-1 text-sm text-white">
              Save
            </button>
            <button type="button" onClick={cancel} className="px-2 text-sm text-slate-500">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {h.note && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{h.note}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {h.tags.map((t) => (
              <Link key={t} href={`/search?tag=${encodeURIComponent(t)}`} className="text-slate-500 hover:text-slate-800">
                #{t}
              </Link>
            ))}
            {/* relative time can differ by a minute between server render and hydration */}
            <span className="text-slate-400" suppressHydrationWarning>{timeAgo(h.createdAt)}</span>
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={c === h.color}
            disabled={pending || c === h.color}
            onClick={() => run(() => updateHighlight(h.id, { color: c }))}
            className={`h-4 w-4 rounded-full ${SWATCH[c]} ${c === h.color ? "ring-2 ring-slate-700 ring-offset-1" : ""}`}
          />
        ))}
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="ml-3 text-sm text-blue-600 hover:underline">
            Edit
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this highlight?")) run(() => deleteHighlight(h.id));
          }}
          className="ml-auto text-sm text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
