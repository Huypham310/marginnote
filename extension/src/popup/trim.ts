/**
 * Cuts page text down to `limit` chars for the summarizer, preferring to stop at a sentence end
 * so the model doesn't get half a sentence.
 */
export function trimInput(text: string, limit: number): { input: string; truncated: boolean } {
  if (text.length <= limit) return { input: text, truncated: false };
  const head = text.slice(0, limit);
  const sentenceEnd = head.lastIndexOf(". ") + 1;
  // chỉ cắt ở dấu chấm nếu không mất quá nửa đoạn; không có dấu chấm (code, list...) thì giữ nguyên
  const input = sentenceEnd >= limit / 2 ? head.slice(0, sentenceEnd) : head;
  return { input, truncated: true };
}
