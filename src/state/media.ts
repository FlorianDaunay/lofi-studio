import { onMediaAction, publishNowPlaying, type MediaAction, type NowPlaying } from "@/lib/media";
import { togglePlay } from "./bridge";
import { findSong, sourceName, useLibrary } from "./library";
import { playNext, playPrevious } from "./playback";
import { usePlayer } from "./player";
import { useStudio } from "./studio";

/**
 * Keeps the system's media controls (tray menu, Android notification) in step with the player,
 * and plays their buttons. On Android, "playing" is also what keeps the app alive in the
 * background: the shell holds a foreground service only while it is true.
 */

function currentNowPlaying(): NowPlaying {
  const { songId, playing } = useStudio.getState();
  const { songs, playlists } = useLibrary.getState();
  return {
    title: findSong(songs, songId)?.name ?? "Custom sound",
    subtitle: sourceName(usePlayer.getState().source, playlists),
    playing,
  };
}

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
  let last: NowPlaying | undefined;
  const publish = () => {
    const next = currentNowPlaying();
    if (last && next.title === last.title && next.subtitle === last.subtitle && next.playing === last.playing) return;
    last = next;
    publishNowPlaying(next).catch((error: unknown) => console.warn("Could not update the media controls.", error));
  };
  publish();
  const unsubscribes = [useStudio.subscribe(publish), useLibrary.subscribe(publish), usePlayer.subscribe(publish)];
  const stopActions = onMediaAction((action) => ACTIONS[action]());
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
    stopActions();
  };
}
