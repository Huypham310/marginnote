import type { BgRequest, BgResponse, ContentRequest } from "./types";

/** Ask the service worker to do an API call; throws the API's error message on failure. */
export async function callBackground<T>(req: BgRequest): Promise<T> {
  const res = (await chrome.runtime.sendMessage(req)) as BgResponse<T> | undefined;
  if (!res) throw new Error("Extension background didn't answer, try reloading the page");
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

/** Same idea for the content script running in a tab. */
export async function callContent<T>(tabId: number, req: ContentRequest): Promise<T> {
  let res: BgResponse<T> | undefined;
  try {
    res = (await chrome.tabs.sendMessage(tabId, req)) as BgResponse<T> | undefined;
  } catch {
    // chrome:// pages, the web store, or a tab opened before the extension was installed
    throw new Error("MarginNote can't run on this page (try reloading it)");
  }
  if (!res) throw new Error("No answer from the page");
  if (!res.ok) throw new Error(res.error);
  return res.data;
}
