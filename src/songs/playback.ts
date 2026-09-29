import type { SongParams } from "./types";
import { STEPS } from "@/audio/types";

export const REPEAT_MODES = ["off", "all", "one"] as const;
/** `off` stops after the last song, `all` wraps around, `one` keeps looping the current song. */
export type RepeatMode = (typeof REPEAT_MODES)[number];

/** Where the next songs come from: the whole library or one playlist. */
export type PlaySource = { kind: "library" } | { kind: "playlist"; id: string };

/** The length a new or older song gets: its loop repeated to last about this long. */
export const TARGET_SONG_SECONDS = 120;
/** `autoLoops` stays under this; a user may still pick up to `RANGES.loops.max`. */
const MAX_AUTO_LOOPS = 16;

type Timing = Pick<SongParams, "bpm" | "progression">;

/** One pass through the whole progression. */
export const loopSeconds = (params: Timing): number => params.progression.length * STEPS * (60 / params.bpm / 4);

/** The loop count that makes a song last about `TARGET_SONG_SECONDS`. */
export const autoLoops = (params: Timing): number =>
  Math.min(MAX_AUTO_LOOPS, Math.max(1, Math.round(TARGET_SONG_SECONDS / loopSeconds(params))));

/** How long the song plays before the next one starts. */
export const songSeconds = (params: Timing & Pick<SongParams, "loops">): number => params.loops * loopSeconds(params);

/**
 * How far into the song (0..1) the player is, from what the engine reports. A song that keeps
 * looping (unsaved edits never advance) starts the bar over each time it would have ended.
 */
export function songProgress(params: Timing & Pick<SongParams, "loops">, loop: number, bar: number, step: number): number {
  if (loop < 0 || bar < 0 || step < 0) return 0;
  const loopSteps = params.progression.length * STEPS;
  const loops = Math.max(1, params.loops);
  const within = Math.min(loopSteps, bar * STEPS + step + 1);
  return ((loop % loops) * loopSteps + within) / (loops * loopSteps);
}

interface ShuffleOptions {
  /** Placed first (used when shuffle starts: the song already playing stays where it is). */
  first?: string | null;
  /** Never placed first (used when a shuffled queue wraps: no immediate repeat). */
  avoid?: string | null;
}

/** Fisher-Yates over `ids`. `rng` returns a number in [0, 1), so tests can inject it. */
export function shuffleOrder(ids: readonly string[], rng: () => number, { first, avoid }: ShuffleOptions = {}): string[] {
  const pool = ids.filter((id) => id !== first);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  if (first && ids.includes(first)) return [first, ...pool];
  if (pool.length > 1 && pool[0] === avoid) [pool[0], pool[1]] = [pool[1]!, pool[0]!];
  return pool;
}

/**
 * The play order. Shuffled, it follows `order` (a previous `shuffleOrder`) for the songs that
 * still exist, then any song added since, so edits never break a running queue.
 */
export function buildQueue(ids: readonly string[], shuffle: boolean, order: readonly string[]): string[] {
  if (!shuffle) return [...ids];
  const known = new Set(ids);
  const kept = order.filter((id, i) => known.has(id) && order.indexOf(id) === i);
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export interface Step {
  /** `null` means "stop": the end of the queue with repeat off (or an empty queue). */
  id: string | null;
  /** The queue started over, so a shuffled queue should be reshuffled. */
  wrapped: boolean;
}

/**
 * The song after `current`. `auto` is true when the song simply ended: repeat-one then replays
 * it, while a manual "next" still moves on.
 */
export function nextInQueue(queue: readonly string[], current: string | null, repeat: RepeatMode, auto: boolean): Step {
  if (queue.length === 0) return { id: null, wrapped: false };
  if (auto && repeat === "one" && current !== null) return { id: current, wrapped: false };
  const index = current === null ? -1 : queue.indexOf(current);
  const next = queue[index + 1];
  if (next !== undefined) return { id: next, wrapped: false };
  // Past the last song: stop, or start over.
  return repeat === "off" ? { id: null, wrapped: false } : { id: queue[0]!, wrapped: true };
}

/** The song before `current`; at the start it wraps (repeat on) or restarts the same song (repeat off). */
export function previousInQueue(queue: readonly string[], current: string | null, repeat: RepeatMode): string | null {
  if (queue.length === 0) return null;
  const index = current === null ? -1 : queue.indexOf(current);
  if (index > 0) return queue[index - 1]!;
  if (index === 0 && repeat === "off") return queue[0]!;
  return queue.at(-1)!;
}
