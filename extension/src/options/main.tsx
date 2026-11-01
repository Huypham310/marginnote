import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadSettings, saveSettings, SUMMARY_MODELS, type Settings, type SummaryModel } from "../shared/settings";
import { COLORS, type Color } from "../shared/types";

function Options() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  if (!settings) return null;
  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });

  async function save() {
    await saveSettings(settings!);
    setStatus("Saved.");
  }

  async function testConnection() {
    setStatus("Checking...");
    try {
      const res = await fetch(`${settings!.apiUrl.replace(/\/$/, "")}/health`);
      const body = await res.json();
      setStatus(body.database ? "Connected: API and database are up." : "API is up but the database isn't.");
    } catch {
      setStatus(`Can't reach ${settings!.apiUrl}. Is the API running?`);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "32px auto", font: "14px/1.5 system-ui, sans-serif" }}>
      <h1>MarginNote settings</h1>

      <label>
        API URL
        <input value={settings.apiUrl} onChange={(e) => update({ apiUrl: e.target.value })} style={field} />
      </label>
      <label>
        API token (only if the API sets API_TOKEN)
        <input
          type="password"
          value={settings.apiToken}
          onChange={(e) => update({ apiToken: e.target.value })}
          style={field}
        />
      </label>
      <label>
        Default highlight color
        <select
          value={settings.defaultColor}
          onChange={(e) => update({ defaultColor: e.target.value as Color })}
          style={field}
        >
          {COLORS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Summary model (downloaded once, then cached by the browser)
        <select
          value={settings.summaryModel}
          onChange={(e) => update({ summaryModel: e.target.value as SummaryModel })}
          style={field}
        >
          {Object.entries(SUMMARY_MODELS).map(([key, m]) => (
            <option key={key} value={key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={save}>Save</button>
        <button onClick={testConnection}>Test connection</button>
      </div>
      <p>{status}</p>
    </main>
  );
}

const field = { display: "block", width: "100%", margin: "4px 0 14px", padding: 6, boxSizing: "border-box" } as const;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
