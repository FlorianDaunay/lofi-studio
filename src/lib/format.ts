/** Durations as people read them. Pure: shared by the player, the playlists and the stats. */

/** Dates follow the language of the interface, so a date never reads in another language than its sentence. */
export const UI_LOCALE = "en-US";

/** `125` → `"2:05"`, `3725` → `"1:02:05"`: a position or a song length. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** `125` → `"2 min"`, `4500` → `"1 h 15"`: a rough total. */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** Time spent, precise when small: `"45 s"`, `"12 min"`, `"3.4 h"`, `"128 h"`. */
export function formatSpent(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
}
