import { splitSnippet } from "@/lib/snippet";

export function Snippet({ snippet }: { snippet: string }) {
  return (
    <>
      {splitSnippet(snippet).map((p, i) => (p.match ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  );
}
