// MV3 service worker: no DOM, can be stopped at any time by Chrome, so keep it stateless
chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log(`MarginNote installed (${reason})`);
});
