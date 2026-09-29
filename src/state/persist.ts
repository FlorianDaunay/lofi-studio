import { loadConfig, saveConfig } from "@/lib/persistence";
import { useLearning } from "./learning";
import { useLibrary } from "./library";
import { usePlayer } from "./player";
import { useStats } from "./stats";
import type { PersistedConfig } from "./config";
import { useStudio } from "./studio";

const SAVE_DELAY_MS = 500;
/** Stats change every few seconds while music plays: they are saved at this pace at most. */
const STATS_SAVE_DELAY_MS = 30_000;

/** Restores the saved configuration into the stores. Call once, before the first render. */
export async function restoreConfig(): Promise<void> {
  const saved = await loadConfig();
  if (saved) applyConfig(saved);
}

/** Puts a (sanitized) configuration into every store, replacing what they hold. */
export function applyConfig(saved: PersistedConfig): void {
  useLibrary.getState().hydrate(saved.songs, saved.pinned, saved.playlists);
  usePlayer.getState().set(saved.player);
  useLearning.getState().hydrate(saved.learned);
  useStats.getState().hydrate(saved.stats);
  const { params, songId, dirty, panels } = saved;
  useStudio.getState().hydrate({ params, songId, dirty, panels });
}

/** Everything worth keeping, as written to `config.json`. */
export function snapshot(): PersistedConfig {
  const { params, songId, dirty, panels } = useStudio.getState();
  const { songs, pinned, playlists } = useLibrary.getState();
  const { source, shuffle, repeat } = usePlayer.getState();
  const learned = useLearning.getState().done;
  const { stats } = useStats.getState();
  return { version: 2, params, songId, dirty, panels, songs, pinned, playlists, player: { source, shuffle, repeat }, learned, stats };
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
  // Not debounced (it would never fire during playback): a save is due at most this long after the first change.
  const scheduleLazily = () => {
    if (timer === undefined) timer = setTimeout(flush, STATS_SAVE_DELAY_MS);
  };
  // Do not lose a pending save when the window is hidden or closed.
  const flushPending = () => {
    if (timer !== undefined) flush();
  };

  const unsubscribeStudio = useStudio.subscribe((s, prev) => {
    if (s.params !== prev.params || s.songId !== prev.songId || s.dirty !== prev.dirty || s.panels !== prev.panels) schedule();
  });
  const unsubscribeLibrary = useLibrary.subscribe(schedule);
  const unsubscribePlayer = usePlayer.subscribe((s, prev) => {
    if (s.source !== prev.source || s.shuffle !== prev.shuffle || s.repeat !== prev.repeat) schedule();
  });
  const unsubscribeLearning = useLearning.subscribe(schedule);
  const unsubscribeStats = useStats.subscribe(scheduleLazily);
  window.addEventListener("pagehide", flushPending);
  document.addEventListener("visibilitychange", flushPending);

  return () => {
    unsubscribeStudio();
    unsubscribeLibrary();
    unsubscribeLearning();
    unsubscribeStats();
    unsubscribePlayer();
    window.removeEventListener("pagehide", flushPending);
    document.removeEventListener("visibilitychange", flushPending);
    flushPending();
  };
}
