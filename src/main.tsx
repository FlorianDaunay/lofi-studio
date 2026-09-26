import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startBridge } from "./state/bridge";
import { restoreConfig, startAutosave } from "./state/persist";
import { startHistorySync } from "./state/navigation";
import { startPlayback } from "./state/playback";
import "./themes"; // applies the saved theme before the first paint of the app

/** Owns the store <-> audio engine and store <-> disk wiring for the lifetime of the UI. */
function Root() {
  useEffect(() => {
    const stopBridge = startBridge();
    const stopAutosave = startAutosave();
    const stopPlayback = startPlayback();
    const stopHistorySync = startHistorySync();
    return () => {
      stopBridge();
      stopAutosave();
      stopPlayback();
      stopHistorySync();
    };
  }, []);
  return <App />;
}

async function main() {
  // Restore the saved configuration before rendering, so the engine never sees stale defaults.
  await restoreConfig();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}

void main();
