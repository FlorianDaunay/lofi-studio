import { LIBRARY_SOURCE, addCreating, addListening, addSongCreating, countPlay, countSongEnd, recordSession, type SourceKey, type Stats } from "@/songs/stats";
import { engine } from "./bridge";
import { usePlayer } from "./player";
import { useStats } from "./stats";
import { useStudio } from "./studio";

/**
 * Turns what happens in the app into stats: time listening (per song, source, day and hour),
 * time creating, plays and skips. Listening is measured on the audio clock, which stands still
 * while nothing sounds (even with the computer asleep), so a throttled timer in the background
 * only delays the count, never skews it.
 */

/** Studio time counts as creating until this long after the last edit. */
const EDIT_GRACE_MS = 90_000;
const TICK_MS = 10_000;

const record = (change: (stats: Stats) => Stats) => useStats.getState().record(change);

interface Listening {
  /** `engine.audioTime` when the time was last credited. */
  mark: number;
  songId: string | null;
  source: SourceKey;
}

const listeningNow = (): Listening => {
  const { source } = usePlayer.getState();
  return {
    mark: engine.audioTime,
    songId: useStudio.getState().songId,
    source: source.kind === "playlist" ? source.id : LIBRARY_SOURCE,
  };
};

/** The song playing stops being the current one: it ran to its end (`finished`) or was skipped. */
export function recordSongEnd(finished: boolean) {
  const { playing, songId } = useStudio.getState();
  if (playing && songId !== null) record((stats) => countSongEnd(stats, songId, finished));
}

/** Returns a cleanup function, like `startBridge`. */
export function startActivityTracking(): () => void {
  /** Set while playing: what the seconds since `mark` count for. */
  let listening: Listening | null = null;
  let sessionStart = 0;
  let lastEdit = -Infinity;
  let createMark = Date.now();
  /** Studio time on a sound that is not saved yet: it goes to the song it gets saved as. */
  let unsaved = 0;

  /** Credits the listening since the last mark to what was playing, then starts a new mark. */
  const flushListening = () => {
    if (!listening) return;
    const { mark, songId, source } = listening;
    listening = listeningNow();
    const seconds = listening.mark - mark;
    record((stats) => addListening(stats, new Date(), seconds, songId, source));
  };

  /** Credits the part of the time since the last mark that falls within the grace after the last edit. */
  const flushCreating = () => {
    const now = Date.now();
    const seconds = (Math.min(now, lastEdit + EDIT_GRACE_MS) - Math.max(createMark, lastEdit)) / 1000;
    createMark = now;
    if (seconds <= 0) return;
    const { songId, dirty } = useStudio.getState();
    const saved = songId !== null && !dirty;
    record((stats) => {
      const next = addCreating(stats, new Date(now), seconds);
      return saved ? addSongCreating(next, songId, seconds) : next;
    });
    if (!saved) unsaved += seconds;
  };

  const flush = () => {
    flushListening();
    flushCreating();
  };

  const unsubscribeStudio = useStudio.subscribe((state, prev) => {
    if (state.playing && !prev.playing) {
      listening = listeningNow();
      sessionStart = listening.mark;
      record((stats) => countPlay(stats, new Date(), state.songId));
    } else if (!state.playing && prev.playing) {
      flushListening();
      const session = listening ? listening.mark - sessionStart : 0;
      listening = null;
      record((stats) => recordSession(stats, session));
    } else if (state.playing && state.songId !== prev.songId && state.params !== prev.params) {
      // Another song started (a save changes the id, not the sound): the time so far was the previous one's.
      flushListening();
      record((stats) => countPlay(stats, new Date(), state.songId));
    }

    const saved = prev.dirty && !state.dirty && state.params === prev.params && state.songId !== null;
    if (saved) {
      flushCreating();
      const songId = state.songId;
      const seconds = unsaved;
      unsaved = 0;
      if (songId !== null) record((stats) => addSongCreating(stats, songId, seconds));
    } else if (state.params !== prev.params) {
      // A hand edit or a randomization marks the sound as modified; loading a song does not.
      if (state.dirty) {
        flushCreating();
        lastEdit = Date.now();
      } else {
        unsaved = 0;
      }
    }
  });
  // The source decides what the next seconds count for.
  const unsubscribePlayer = usePlayer.subscribe((state, prev) => {
    if (state.source !== prev.source) flushListening();
  });

  const timer = setInterval(flush, TICK_MS);
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("pagehide", flush);

  return () => {
    flush();
    clearInterval(timer);
    unsubscribeStudio();
    unsubscribePlayer();
    document.removeEventListener("visibilitychange", flush);
    window.removeEventListener("pagehide", flush);
  };
}
