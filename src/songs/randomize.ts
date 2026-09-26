import { BASS_VOICES, DRUM_KITS, KEYS_VOICES, LEAD_VOICES, PAD_VOICES, STEPS, type Chord, type EngineParams, type Pattern, type Waveform } from "@/audio/types";
import { parseProgression } from "./chords";
import { emptyPattern } from "./params";

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
  "Dm9 G13 Cmaj7 A7",
  "Cmaj7 Am9 Dm9 G13",
  "Am9 Fmaj7 Cmaj7 E7",
  "Ebmaj7 Cm9 Fm9 Bb13",
  "Fmaj7 Em7 Dm9 G13",
  "Gm9 C13 Fmaj7 Bbmaj7",
  "Bbmaj7 Gm9 Cm9 F13",
  "Em9 A13 Dmaj7 Bm7",
].map(parseProgression);

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

  // A short motif: only heard when the melody instrument is turned up.
  maybe([0, 3, 6, 8, 10, 12, 14], 0.35, p.lead);
  return p;
}

const SOFT_WAVES: readonly Waveform[] = ["sine", "triangle"];

/** Timbre (voices included), effects and ambience within a soft, warm range. Levels and envelopes are left alone. */
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
      voice: pickOne(rng, KEYS_VOICES),
      wave: pickOne(rng, SOFT_WAVES),
      cutoff: integer(rng, 1800, 3600),
      lfoRate: between(rng, 0.1, 0.8),
      lfoDepth: between(rng, 0.2, 0.6),
    },
    bass: { ...p.bass, voice: pickOne(rng, BASS_VOICES) },
    drums: { ...p.drums, kit: pickOne(rng, DRUM_KITS) },
    pad: { ...p.pad, voice: pickOne(rng, PAD_VOICES) },
    lead: { ...p.lead, voice: pickOne(rng, LEAD_VOICES) },
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
