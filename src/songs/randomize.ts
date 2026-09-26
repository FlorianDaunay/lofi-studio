import type { Chord, EngineParams, Pattern, Waveform } from "@/audio/types";
import { STEPS } from "@/audio/types";
import { emptyPattern, PC } from "./params";

/**
 * Musical randomness: every function draws from lists and ranges that sound good together, rather
 * than from the full range of each control (random chords or a random cutoff are mostly ugly).
 * The random source is injectable so the results are testable.
 */

export type Rng = () => number;

/** What the "Randomize" menu can change. */
export const RANDOMIZE_KINDS = ["groove", "chords", "sound", "surprise"] as const;
export type RandomizeKind = (typeof RANDOMIZE_KINDS)[number];

const between = (rng: Rng, min: number, max: number) => Math.round((min + rng() * (max - min)) * 100) / 100;
const integer = (rng: Rng, min: number, max: number) => Math.floor(min + rng() * (max - min + 1));
const pickOne = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;

/** Jazzy four-bar progressions that all resolve nicely, so any of them works with any groove. */
export const PROGRESSIONS: readonly Chord[][] = [
  [{ pc: PC.D, quality: "m9" }, { pc: PC.G, quality: "dom13" }, { pc: PC.C, quality: "maj7" }, { pc: PC.A, quality: "dom7" }],
  [{ pc: PC.C, quality: "maj7" }, { pc: PC.A, quality: "m9" }, { pc: PC.D, quality: "m9" }, { pc: PC.G, quality: "dom13" }],
  [{ pc: PC.A, quality: "m9" }, { pc: PC.F, quality: "maj7" }, { pc: PC.C, quality: "maj7" }, { pc: PC.E, quality: "dom7" }],
  [{ pc: PC.Eb, quality: "maj7" }, { pc: PC.C, quality: "m9" }, { pc: PC.F, quality: "m9" }, { pc: PC.Bb, quality: "dom13" }],
  [{ pc: PC.F, quality: "maj7" }, { pc: PC.E, quality: "m7" }, { pc: PC.D, quality: "m9" }, { pc: PC.G, quality: "dom13" }],
  [{ pc: PC.G, quality: "m9" }, { pc: PC.C, quality: "dom13" }, { pc: PC.F, quality: "maj7" }, { pc: PC.Bb, quality: "maj7" }],
  [{ pc: PC.Bb, quality: "maj7" }, { pc: PC.G, quality: "m9" }, { pc: PC.C, quality: "m9" }, { pc: PC.F, quality: "dom13" }],
  [{ pc: PC.E, quality: "m9" }, { pc: PC.A, quality: "dom13" }, { pc: PC.D, quality: "maj7" }, { pc: 11, quality: "m7" }],
];

const sameProgression = (a: readonly Chord[], b: readonly Chord[]) =>
  a.length === b.length && a.every((chord, i) => chord.pc === b[i]!.pc && chord.quality === b[i]!.quality);

/** A progression from the list, never the one already playing. */
export function randomProgression(current: readonly Chord[], rng: Rng = Math.random): Chord[] {
  const others = PROGRESSIONS.filter((p) => !sameProgression(p, current));
  return [...pickOne(rng, others)];
}

/** A fresh boom-bap groove: fixed backbone (kick on 1, snare on 2 and 4), random ghost notes. */
export function randomPattern(rng: Rng = Math.random): Pattern {
  const p = emptyPattern();
  const maybe = (steps: number[], chance: number, into: boolean[]) => {
    for (const s of steps) if (rng() < chance) into[s] = true;
  };

  p.kick[0] = true;
  maybe([7, 10], 0.65, p.kick);
  maybe([3, 14], 0.2, p.kick);

  p.snare[4] = true;
  p.snare[12] = true;
  maybe([15], 0.2, p.snare);

  for (let i = 0; i < STEPS; i++) p.hat[i] = rng() < (i % 2 === 0 ? 0.9 : 0.25);

  p.bass[0] = true;
  maybe([3, 6, 7, 10, 11, 14], 0.3, p.bass);

  p.keys[0] = true;
  maybe([6, 7, 10], 0.4, p.keys);
  return p;
}

const SOFT_WAVES: readonly Waveform[] = ["sine", "triangle"];

/** Timbre, effects and ambience within a soft, warm range. Levels and envelopes are left alone. */
function randomSound(p: EngineParams, rng: Rng): EngineParams {
  // One or two ambience layers, at a moderate level.
  const layers = ["rain", "vinyl", "wind"] as const;
  const first = pickOne(rng, layers);
  const second = rng() < 0.5 ? pickOne(rng, layers) : first;
  const ambience = { rain: 0, vinyl: 0, wind: 0 };
  ambience[first] = between(rng, 0.3, 0.6);
  ambience[second] = Math.max(ambience[second], between(rng, 0.15, 0.4));

  return {
    ...p,
    keys: {
      ...p.keys,
      wave: pickOne(rng, SOFT_WAVES),
      cutoff: integer(rng, 1800, 3600),
      lfoRate: between(rng, 0.1, 0.8),
      lfoDepth: between(rng, 0.2, 0.6),
    },
    fx: {
      tone: integer(rng, 3500, 6000),
      wobble: between(rng, 0.15, 0.55),
      warmth: between(rng, 0.2, 0.5),
      reverb: between(rng, 0.15, 0.4),
    },
    ambience,
  };
}

/** Returns new params with only what `kind` covers changed. Never touches volume or instrument levels. */
export function randomize(kind: RandomizeKind, p: EngineParams, rng: Rng = Math.random): EngineParams {
  switch (kind) {
    case "groove":
      return { ...p, pattern: randomPattern(rng) };
    case "chords":
      return { ...p, progression: randomProgression(p.progression, rng) };
    case "sound":
      return randomSound(p, rng);
    case "surprise":
      return {
        ...randomSound(p, rng),
        bpm: integer(rng, 72, 85),
        swing: between(rng, 0.3, 0.65),
        humanize: between(rng, 0.25, 0.55),
        pattern: randomPattern(rng),
        progression: randomProgression(p.progression, rng),
      };
  }
}
