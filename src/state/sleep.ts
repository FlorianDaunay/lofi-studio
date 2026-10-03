import { create } from "zustand";
import { engine } from "./bridge";
import { useStudio } from "./studio";

/**
 * The sleep timer: stop the music after a while, or at the end of the song, with a slow fade.
 * Not persisted (it means "tonight"), and it ends whenever the music stops.
 */

/** Long enough to feel like drifting off, short enough not to keep the phone awake for nothing. */
export const SLEEP_FADE_SECONDS = 20;
/** At the end of a song the next one must not get going: the fade is short. */
const SONG_END_FADE_SECONDS = 3;
export const SLEEP_MINUTES = [15, 30, 45, 60, 90] as const;

interface SleepState {
  /** Epoch ms at which the fade starts, `null` when no timer is set. */
  endsAt: number | null;
  /** Stop when the current song ends instead. */
  afterSong: boolean;
}

export const useSleep = create<SleepState>()(() => ({ endsAt: null, afterSong: false }));

export const setSleepTimer = (minutes: number) => useSleep.setState({ endsAt: Date.now() + minutes * 60_000, afterSong: false });
export const sleepAfterSong = () => useSleep.setState({ endsAt: null, afterSong: true });
export const cancelSleepTimer = () => useSleep.setState({ endsAt: null, afterSong: false });

/**
 * Called when the current song has played its loops. Returns true when the sleep timer takes
 * over (the music fades out instead of moving on).
 */
export function sleepAtSongEnd(): boolean {
  if (!useSleep.getState().afterSong) return false;
  cancelSleepTimer();
  engine.fadeOut(SONG_END_FADE_SECONDS);
  return true;
}

/**
 * Watches the clock. A timer is throttled in a hidden page (down to once a minute on Android),
 * so the loop ends of the audio clock check too: the music never plays much past its time.
 * Returns a cleanup function, like `startBridge`.
 */
export function startSleepTimer(): () => void {
  const check = () => {
    const { endsAt } = useSleep.getState();
    if (endsAt === null || Date.now() < endsAt) return;
    cancelSleepTimer();
    engine.fadeOut(SLEEP_FADE_SECONDS);
  };
  const timer = setInterval(check, 1000);
  const removeLoopListener = engine.addLoopEndListener(check);
  // Stopping by hand (or by the timer itself) ends the timer: it was for this listening session.
  const unsubscribe = useStudio.subscribe((state, prev) => {
    if (prev.playing && !state.playing) cancelSleepTimer();
  });
  return () => {
    clearInterval(timer);
    removeLoopListener();
    unsubscribe();
  };
}
