import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { callBackground, callContent } from "../shared/messaging";
import { loadSettings, type Settings } from "../shared/settings";
import { COLORS, type Color, type Highlight } from "../shared/types";
import { summarize, type Progress } from "./summarize";
import "./popup.css";

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("http")) throw new Error("Open a normal web page to use MarginNote");
  return tab;
}

function Popup() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([activeTab(), loadSettings()]);
        setTab(t);
        setSettings(s);
        setHighlights(await callBackground<Highlight[]>({ type: "list", url: t.url! }));
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, []);

  async function run<T>(fn: () => Promise<T>) {
    try {
      setError(null);
      return await fn();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const highlightSelection = () =>
    run(async () => {
      const h = await callContent<Highlight | null>(tab!.id!, { type: "highlightSelection" });
      if (!h) throw new Error("Select some text on the page first");
      setHighlights((list) => [...list, h]);
    });

  const remove = (id: number) =>
    run(async () => {
      await callBackground({ type: "delete", id });
      await callContent(tab!.id!, { type: "remove", id });
      setHighlights((list) => list.filter((h) => h.id !== id));
    });

  const setColor = (id: number, color: Color) =>
    run(async () => {
      await callBackground({ type: "update", id, patch: { color } });
      await callContent(tab!.id!, { type: "recolor", id, color });
      setHighlights((list) => list.map((h) => (h.id === id ? { ...h, color } : h)));
    });

  const saveNote = (id: number, note: string) =>
    run(() => callBackground({ type: "update", id, patch: { note } }));

  const summarizePage = () =>
    run(async () => {
      setSummary(null);
      setSummaryState("Reading the page...");
      const { text } = await callContent<{ title: string; text: string }>(tab!.id!, { type: "pageText" });
      if (text.length < 200) throw new Error("Not enough text on this page to summarize");
      setSummaryState("Loading the model (first time downloads it once)...");
      const result = await summarize(text, settings!.summaryModel, (p: Progress) =>
        setSummaryState(`Downloading ${p.file}: ${p.loadedMb.toFixed(0)} / ${p.totalMb.toFixed(0)} MB`),
      );
      setSummary(result.summary + (result.truncated ? " (from the first part of the page)" : ""));
      // chỉ lưu summary khi trang đã có highlight, tức là đã có row trong bảng pages
      if (highlights[0]) {
        await callBackground({ type: "saveSummary", pageId: highlights[0].pageId, summary: result.summary });
      }
    }).finally(() => setSummaryState(null));

  return (
    <main>
      <header>
        <h1>MarginNote</h1>
        <button className="link" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      <button className="primary" onClick={highlightSelection} disabled={!tab}>
        Highlight selection
      </button>

      <section>
        <h2>On this page ({highlights.length})</h2>
        {highlights.length === 0 && <p className="muted">Nothing yet. Select text and press Alt+Shift+H.</p>}
        <ul>
          {highlights.map((h) => (
            <li key={h.id} className={`hl hl-${h.color}`}>
              <button className="quote" onClick={() => callContent(tab!.id!, { type: "scrollTo", id: h.id })}>
                {h.text.length > 140 ? `${h.text.slice(0, 140)}...` : h.text}
              </button>
              <textarea
                placeholder="Add a note"
                defaultValue={h.note}
                onBlur={(e) => e.target.value !== h.note && saveNote(h.id, e.target.value)}
              />
              <div className="row">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    className={`dot dot-${c} ${c === h.color ? "active" : ""}`}
                    onClick={() => setColor(h.id, c)}
                  />
                ))}
                <button className="link danger" onClick={() => remove(h.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Summary</h2>
        <button onClick={summarizePage} disabled={!tab || !settings || summaryState !== null}>
          Summarize this page
        </button>
        {summaryState && <p className="muted">{summaryState}</p>}
        {summary && <p className="summary">{summary}</p>}
        <p className="muted small">Runs locally in your browser, nothing is sent to an AI service.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
