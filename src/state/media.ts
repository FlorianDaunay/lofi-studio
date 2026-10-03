import { create } from "zustand";
import { onMediaAction, publishNowPlaying, type MediaAction, type NowPlaying } from "@/lib/media";
import { songSeconds } from "@/songs/playback";
import { resolveTheme, useThemeStore } from "@/themes";
import { parseColor } from "@/themes/color";
import { engine, togglePlay } from "./bridge";
import { findSong, sourceName, useLibrary } from "./library";
import { playNext, playPrevious } from "./playback";
import { usePlayer } from "./player";
import { useStudio } from "./studio";

/**
 * Keeps the system's media controls (tray menu, Android notification and lock screen) in step
 * with the player, and plays their buttons. On Android, "playing" is also what keeps the app
 * alive in the background: the shell holds a foreground service only while it is true.
 *
 * The progress bar is drawn by the system from the song's length and a position: the position is
 * sent when something changes and again at the end of each loop, the system moves it in between.
 */

/** The current cover as a PNG, drawn by `MediaArtwork` (Android only: elsewhere nothing shows it). */
export const useMediaArtwork = create<{ png: string | null }>()(() => ({ png: null }));

const accentOf = (): number => {
  const { r, g, b } = parseColor(resolveTheme(useThemeStore.getState()).colors.accent);
  return (r << 16) | (g << 8) | b;
};

function currentNowPlaying(): Omit<NowPlaying, "artwork"> {
  const { songId, playing, params } = useStudio.getState();
  const { songs, playlists } = useLibrary.getState();
  const duration = songSeconds(params);
  return {
    title: findSong(songs, songId)?.name ?? "Custom sound",
    subtitle: sourceName(usePlayer.getState().source, playlists),
    playing,
    duration,
    // A sound with unsaved edits loops on past its length: the bar starts over, as in the app.
    position: duration > 0 ? engine.songTime % duration : 0,
    accent: accentOf(),
  };
}

/** Everything but the position, which moves all the time and is only resent when it matters. */
const sameState = (a: Omit<NowPlaying, "artwork">, b: Omit<NowPlaying, "artwork">) =>
  a.title === b.title && a.subtitle === b.subtitle && a.playing === b.playing && Math.abs(a.duration - b.duration) < 0.01 && a.accent === b.accent;

const ACTIONS: Record<MediaAction, () => void> = {
  play: () => {
    if (!useStudio.getState().playing) void togglePlay();
  },
  pause: () => {
    if (useStudio.getState().playing) void togglePlay();
  },
  toggle: () => void togglePlay(),
  next: playNext,
  previous: playPrevious,
};

/** Returns a cleanup function, like `startBridge`. */
export function startMediaSync(): () => void {
  let last: Omit<NowPlaying, "artwork"> | undefined;
  let sentArtwork: string | null = null;
  let scheduled = false;
  let force = false;

  const publish = () => {
    scheduled = false;
    const next = currentNowPlaying();
    const { png } = useMediaArtwork.getState();
    const artwork = png !== sentArtwork ? png : null;
    if (last && sameState(next, last) && !force && artwork === null) return;
    last = next;
    force = false;
    if (artwork !== null) sentArtwork = artwork;
    publishNowPlaying(artwork !== null ? { ...next, artwork } : next).catch((error: unknown) =>
      console.warn("Could not update the media controls.", error),
    );
  };
  // Several stores often change together (a new song, its source): one update for all of them.
  const schedule = (forced = false) => {
    force ||= forced;
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(publish);
  };

  publish();
  const unsubscribes = [
    useStudio.subscribe((state, prev) => {
      // Another song (or the same one, restarted) begins: its bar starts from zero.
      const restarted = state.songId !== prev.songId || state.playing !== prev.playing;
      if (restarted || state.params !== prev.params) schedule(restarted);
    }),
    useLibrary.subscribe(() => schedule()),
    usePlayer.subscribe(() => schedule()),
    useThemeStore.subscribe(() => schedule()),
    useMediaArtwork.subscribe(() => schedule()),
    // On the audio clock, so it keeps the bar right in the background too.
    engine.addLoopEndListener(() => schedule(true)),
  ];
  const stopActions = onMediaAction((action) => ACTIONS[action]());
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
    stopActions();
  };
}
