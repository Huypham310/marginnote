import type { Color } from "../shared/types";

const MARK_CLASS = "mn-hl";

/** Text nodes that the range touches, in document order. */
function textNodesIn(range: Range): Text[] {
  const root = range.commonAncestorContainer;
  if (root.nodeType === Node.TEXT_NODE) return [root as Text];
  const out: Text[] = [];
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (range.intersectsNode(n) && (n as Text).data.length > 0) out.push(n as Text);
  }
  return out;
}

/**
 * Wraps the range in <mark> elements. A selection across paragraphs or links can't be one
 * element, so every touched text node gets its own mark with the same data-mn-id.
 */
export function wrapRange(range: Range, id: number, color: Color): HTMLElement[] {
  const marks: HTMLElement[] = [];
  for (const node of textNodesIn(range)) {
    let target = node;
    // cắt text node ở hai đầu để chỉ bọc đúng phần được chọn
    if (node === range.endContainer && range.endOffset < node.data.length) {
      node.splitText(range.endOffset);
    }
    if (node === range.startContainer && range.startOffset > 0) {
      target = node.splitText(range.startOffset);
    }
    if (!target.data.trim()) continue; // skip whitespace-only nodes between blocks
    const mark = node.ownerDocument.createElement("mark");
    mark.className = `${MARK_CLASS} ${MARK_CLASS}-${color}`;
    mark.dataset.mnId = String(id);
    target.parentNode!.insertBefore(mark, target);
    mark.appendChild(target);
    marks.push(mark);
  }
  return marks;
}

export function marksFor(doc: Document, id: number): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>(`mark.${MARK_CLASS}[data-mn-id="${id}"]`)];
}

/** Removes the marks but keeps their text, merging the split text nodes back. */
export function unwrap(doc: Document, id: number): void {
  for (const mark of marksFor(doc, id)) {
    const parent = mark.parentNode!;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}

export function recolor(doc: Document, id: number, color: Color): void {
  for (const mark of marksFor(doc, id)) {
    mark.className = `${MARK_CLASS} ${MARK_CLASS}-${color}`;
  }
}
