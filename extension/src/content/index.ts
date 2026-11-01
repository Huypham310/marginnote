import { callBackground } from "../shared/messaging";
import type { Color, ContentRequest, Highlight } from "../shared/types";
import { describeRange, findAnchor } from "./anchor";
import { marksFor, recolor, unwrap, wrapRange } from "./highlighter";

const pageUrl = () => location.href;

async function restoreHighlights() {
  let highlights: Highlight[];
  try {
    highlights = await callBackground<Highlight[]>({ type: "list", url: pageUrl() });
  } catch {
    return; // API down or page not supported: just don't paint anything
  }
  let missing = 0;
  for (const h of highlights) {
    const range = findAnchor(document.body, h.anchor);
    if (range) wrapRange(range, h.id, h.color);
    else missing++;
  }
  // trang đổi nội dung thì có thể không tìm lại được, log ra để debug
  if (missing) console.info(`[MarginNote] ${missing} highlight(s) not found on this page anymore`);
}

async function highlightSelection(color?: Color): Promise<Highlight | null> {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const anchor = describeRange(document.body, range);
  if (!anchor.exact.trim()) return null;

  const saved = await callBackground<Highlight>({
    type: "save",
    highlight: {
      url: pageUrl(),
      title: document.title,
      text: anchor.exact.trim(),
      color: color ?? (await defaultColor()),
      anchor,
    },
  });
  wrapRange(range, saved.id, saved.color);
  selection.removeAllRanges();
  return saved;
}

async function defaultColor(): Promise<Color> {
  const { defaultColor } = await chrome.storage.sync.get({ defaultColor: "yellow" });
  return defaultColor as Color;
}

/** Main readable text of the page, used as input for the summarizer. */
function pageText(): string {
  const root = document.querySelector("article, main, [role=main]") ?? document.body;
  return (root as HTMLElement).innerText.replace(/\s+/g, " ").trim();
}

// --- floating "Highlight" button next to a fresh selection ---

const button = document.createElement("button");
button.dataset.mnUi = "";
button.className = "mn-float";
button.textContent = "Highlight";
button.hidden = true;
document.documentElement.appendChild(button);

button.addEventListener("mousedown", (e) => e.preventDefault()); // keep the selection alive
button.addEventListener("click", async () => {
  button.hidden = true;
  try {
    await highlightSelection();
  } catch (err) {
    alert(`MarginNote: ${(err as Error).message}`);
  }
});

document.addEventListener("mouseup", (e) => {
  if ((e.target as Element).closest?.("[data-mn-ui]")) return;
  // đợi 1 tick để selection cập nhật xong
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      button.hidden = true;
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    button.style.top = `${window.scrollY + rect.top - 36}px`;
    button.style.left = `${window.scrollX + rect.left}px`;
    button.hidden = false;
  }, 0);
});

// --- messages from the service worker (context menu, shortcut) and the popup ---

chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, sendResponse) => {
  const reply = async () => {
    switch (msg.type) {
      case "highlightSelection":
        return highlightSelection(msg.color);
      case "scrollTo": {
        const [first] = marksFor(document, msg.id);
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        marksFor(document, msg.id).forEach((m) => {
          m.classList.add("mn-flash");
          setTimeout(() => m.classList.remove("mn-flash"), 1200);
        });
        return Boolean(first);
      }
      case "remove":
        unwrap(document, msg.id);
        return true;
      case "recolor":
        recolor(document, msg.id, msg.color);
        return true;
      case "pageText":
        return { title: document.title, text: pageText() };
    }
  };
  reply()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
  return true; // keep the channel open for the async reply
});

restoreHighlights();
