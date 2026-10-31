import type { Anchor } from "../shared/types";

const CONTEXT_CHARS = 32;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"]);

interface TextIndex {
  text: string;
  nodes: { node: Text; start: number }[];
}

/**
 * Concatenates every visible text node under `root`, remembering where each node starts.
 * Global offsets into `text` can then be mapped back to (node, offset) pairs.
 */
export function buildTextIndex(root: Node): TextIndex {
  const nodes: TextIndex["nodes"] = [];
  let text = "";
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      // our own floating toolbar shouldn't count as page text
      if (parent.closest("[data-mn-ui]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, start: text.length });
    text += (n as Text).data;
  }
  return { text, nodes };
}

function globalOffset(index: TextIndex, node: Node, offset: number): number {
  // a range boundary can sit on an element (offset = child index) instead of a text node
  if (node.nodeType !== Node.TEXT_NODE) {
    const child = node.childNodes[offset] ?? null;
    const walker = node.ownerDocument!.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let target: Node | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (child && (child === n || child.contains(n))) { target = n; break; }
      target = n;
    }
    const hit = index.nodes.find((e) => e.node === target);
    if (!hit) return child ? 0 : index.text.length;
    return child ? hit.start : hit.start + hit.node.data.length;
  }
  const hit = index.nodes.find((e) => e.node === node);
  if (!hit) throw new Error("range is outside the indexed root");
  return hit.start + offset;
}

/** Turns a DOM selection into a text-quote anchor that survives page reloads. */
export function describeRange(root: Node, range: Range): Anchor {
  const index = buildTextIndex(root);
  const start = globalOffset(index, range.startContainer, range.startOffset);
  const end = globalOffset(index, range.endContainer, range.endOffset);
  return {
    exact: index.text.slice(start, end),
    prefix: index.text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    suffix: index.text.slice(end, end + CONTEXT_CHARS),
  };
}

/** Length of the common suffix of a and b (prefix context is compared from the right). */
function commonSuffix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function pointAt(index: TextIndex, offset: number, preferNext: boolean): [Text, number] {
  // binary search would be faster, but pages have at most a few thousand text nodes
  for (let i = 0; i < index.nodes.length; i++) {
    const { node, start } = index.nodes[i];
    const end = start + node.data.length;
    if (offset < end || (offset === end && !preferNext) || i === index.nodes.length - 1) {
      return [node, offset - start];
    }
  }
  throw new Error("empty text index");
}

/**
 * Finds the passage again. When the quote occurs several times, the occurrence whose
 * surrounding text best matches the stored prefix/suffix wins.
 */
export function findAnchor(root: Node, anchor: Anchor): Range | null {
  if (!anchor.exact) return null;
  const index = buildTextIndex(root);
  let best = -1;
  let bestScore = -1;
  for (let at = index.text.indexOf(anchor.exact); at !== -1; at = index.text.indexOf(anchor.exact, at + 1)) {
    const before = index.text.slice(Math.max(0, at - anchor.prefix.length), at);
    const after = index.text.slice(at + anchor.exact.length, at + anchor.exact.length + anchor.suffix.length);
    const score = commonSuffix(before, anchor.prefix) + commonPrefix(after, anchor.suffix);
    if (score > bestScore) {
      best = at;
      bestScore = score;
    }
  }
  if (best === -1) return null;

  const range = root.ownerDocument!.createRange();
  const [startNode, startOffset] = pointAt(index, best, true);
  const [endNode, endOffset] = pointAt(index, best + anchor.exact.length, false);
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
