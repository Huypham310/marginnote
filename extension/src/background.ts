import { api } from "./shared/api";
import type { BgRequest } from "./shared/types";

// MV3 service worker: no DOM, and Chrome can stop it at any time, so keep it stateless.
// Content scripts can't call the API directly (they're subject to the page's CORS),
// so every API request goes through here.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "mn-highlight",
    title: "Highlight selection",
    contexts: ["selection"],
  });
});

function highlightIn(tabId: number | undefined) {
  if (tabId === undefined) return;
  chrome.tabs.sendMessage(tabId, { type: "highlightSelection" }).catch(() => {
    // tab has no content script (chrome:// page, or it was open before install)
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "mn-highlight") highlightIn(tab?.id);
});

// keyboard shortcut from manifest "commands" (Alt+Shift+H by default)
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "highlight-selection") highlightIn(tab?.id);
});

chrome.runtime.onMessage.addListener((msg: BgRequest, _sender, sendResponse) => {
  const run = async () => {
    switch (msg.type) {
      case "save":
        return api.save(msg.highlight);
      case "list":
        return api.list(msg.url);
      case "update":
        return api.update(msg.id, msg.patch);
      case "delete":
        return api.remove(msg.id);
      case "saveSummary":
        return api.saveSummary(msg.pageId, msg.summary);
    }
  };
  run()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
  return true; // async sendResponse
});
