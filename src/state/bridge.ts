import { AudioEngine } from "@/audio";
import { isMobile } from "@/lib/runtime";
import { useStudio } from "./studio";

/** The single audio engine of the app. */
export const engine = new AudioEngine({ lowPower: isMobile });

/**
 * Wires the studio store to the engine: params flow in, playback state flows out.
 * Returns a cleanup function, so React StrictMode and hot reload can start it twice safely.
 */
export function startBridge(): () => void {
  const { getState, setState, subscribe } = useStudio;

  engine.update(getState().params);
  engine.onPlayingChange((playing) => getState().setPlaying(playing));

  // The step display only matters while someone can see it (the app keeps playing in the background).
  const followSteps = () => {
    const visible = document.visibilityState === "visible";
    engine.onStep(visible ? (step, bar, loop) => getState().setStep(step, bar, loop) : undefined);
    if (!visible) getState().setStep(-1, -1, -1);
  };
  followSteps();
  document.addEventListener("visibilitychange", followSteps);

  const unsubscribe = subscribe((state, prev) => {
    if (state.params !== prev.params) engine.update(state.params);
    // Another song was loaded (a save changes the id but keeps the params): it plays from its first bar.
    if (state.songId !== prev.songId && state.params !== prev.params) engine.restartLoop();
  });

  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", followSteps);
    engine.onPlayingChange(undefined);
    engine.onStep(undefined);
    setState({ playing: false, step: -1, bar: -1, loop: -1 });
  };
}

/** Play / stop from a click (the first play needs a user gesture to unlock the AudioContext). */
export async function togglePlay(): Promise<void> {
  const { playing, starting, setStarting, setError } = useStudio.getState();
  if (starting) return;
  if (playing) return engine.stop();
  setStarting(true);
  setError(null);
  try {
    await engine.play();
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
  } finally {
    setStarting(false);
  }
}

// Hot reload replaces this module: release the old AudioContext instead of leaking it.
if (import.meta.hot) import.meta.hot.dispose(() => void engine.dispose());
