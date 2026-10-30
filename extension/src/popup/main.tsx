import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function Popup() {
  return (
    <main style={{ width: 320, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 18, margin: 0 }}>MarginNote</h1>
      <p style={{ color: "#555" }}>Highlights for this page will show up here.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
