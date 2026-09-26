import { loadConfig, saveConfig } from "@/lib/persistence";
import { useLibrary } from "./library";
import type { PersistedConfig } from "./config";
import { useStudio } from "./studio";

const SAVE_DELAY_MS = 500;

/** Restores the saved configuration into the stores. Call once, before the first render. */
export async function restoreConfig(): Promise<void> {
  const saved = await loadConfig();
  if (!saved) return;
  useLibrary.getState().hydrate(saved.songs, saved.pinned);
  const { params, songId, dirty, panels } = saved;
  useStudio.getState().hydrate({ params, songId, dirty, panels });
}

function snapshot(): PersistedConfig {
  const { params, songId, dirty, panels } = useStudio.getState();
  const { songs, pinned } = useLibrary.getState();
  return { version: 2, params, songId, dirty, panels, songs, pinned };
}

/**
 * Saves the configuration (debounced) whenever something worth keeping changes. Playback state
 * is not worth keeping. Returns a cleanup function.
 */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    saveConfig(snapshot()).catch((error) => console.warn("Could not save the configuration.", error));
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  };
  // Do not lose a pending save when the window is hidden or closed.
  const flushPending = () => {
    if (timer !== undefined) flush();
  };

  const unsubscribeStudio = useStudio.subscribe((s, prev) => {
    if (s.params !== prev.params || s.songId !== prev.songId || s.dirty !== prev.dirty || s.panels !== prev.panels) schedule();
  });
  const unsubscribeLibrary = useLibrary.subscribe(schedule);
  window.addEventListener("pagehide", flushPending);
  document.addEventListener("visibilitychange", flushPending);

  return () => {
    unsubscribeStudio();
    unsubscribeLibrary();
    window.removeEventListener("pagehide", flushPending);
    document.removeEventListener("visibilitychange", flushPending);
    flushPending();
  };
}
