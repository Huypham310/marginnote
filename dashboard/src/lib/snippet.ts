export interface SnippetPart {
  text: string;
  match: boolean;
}

/**
 * Splits a ts_headline snippet into plain/matched parts.
 *
 * ts_headline does NOT escape the highlight text, so a saved highlight like
 * `<img src=x onerror=...>` would come back as live HTML. Instead of
 * dangerouslySetInnerHTML we only treat the exact <mark>/</mark> markers as structure
 * and render everything else as text (React escapes it).
 */
export function splitSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  let match = false;
  for (const piece of snippet.split(/(<\/?mark>)/)) {
    if (piece === "<mark>") match = true;
    else if (piece === "</mark>") match = false;
    else if (piece) {
      // gộp các đoạn liền nhau cùng loại cho gọn
      const last = parts[parts.length - 1];
      if (last && last.match === match) last.text += piece;
      else parts.push({ text: piece, match });
    }
  }
  return parts;
}
