import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startActivityTracking } from "./state/activity";
import { startBridge } from "./state/bridge";
import { startMediaSync } from "./state/media";
import { restoreConfig, startAutosave } from "./state/persist";
import { startHistorySync } from "./state/navigation";
import { startPlayback } from "./state/playback";
import { startWindowSync } from "./state/window";
import "./themes"; // applies the saved theme before the first paint of the app

/** Owns the store <-> audio engine, store <-> disk and store <-> app shell wiring for the lifetime of the UI. */
function Root() {
  useEffect(() => {
    const stops = [startBridge(), startAutosave(), startPlayback(), startHistorySync(), startMediaSync(), startWindowSync(), startActivityTracking()];
    return () => {
      for (const stop of stops) stop();
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
