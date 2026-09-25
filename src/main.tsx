import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadConfig } from "./lib/persistence";
import { startBridge } from "./state/bridge";
import { useStudio } from "./state/studio";
import "./themes"; // applies the saved theme before the first paint of the app

/** Owns the store <-> audio engine <-> disk wiring for the lifetime of the UI. */
function Root() {
  useEffect(() => startBridge(), []);
  return <App />;
}

async function main() {
  // Restore the saved configuration before rendering, so the engine never sees stale defaults.
  const saved = await loadConfig();
  if (saved) useStudio.getState().hydrate(saved);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}

void main();
