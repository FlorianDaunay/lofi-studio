import { CHORD_QUALITIES, STEPS, TRACKS, type Chord } from "@/audio/types";
import { RANGES } from "./ranges";
import type { SongParams } from "./types";

/**
 * Cover art is a pure function of the song's params: no hashing and no randomness, so two songs
 * that sound alike get covers that look alike. Every field of a scene is a continuous 0..1
 * number (or a small list of them) that the renderer maps to shapes and colors; a slider moved
 * a little moves one shape a little.
 *
 * The one discrete choice is the `world` (city, sea, mountains...): it follows the strongest
 * character of the song (its ambience and instrument voices), so it only changes when the song
 * clearly changes too.
 */

export const COVER_WORLDS = ["city", "sea", "mountains", "forest", "desert", "fields"] as const;
export type CoverWorld = (typeof COVER_WORLDS)[number];

/** One landmark per chord, in bar order (a progression has 1 to 8): a building, a peak, a tree... */
export interface Landmark {
  /** 0..1 from the root note: a taller landmark is a higher root. */
  height: number;
  /** 0..1 from the chord quality: minor to major to dominant. */
  tint: number;
}

export interface CoverScene {
  world: CoverWorld;
  /** Circular 0..1: the key, as the average of the chord roots. */
  hue: number;
  /** How far the lower sky drifts away from `hue`: reverb. */
  drift: number;
  lightness: number;
  saturation: number;
  sun: { x: number; size: number; glow: number; opacity: number };
  wave: { amplitude: number; rate: number; depth: number; phase: number; jitter: number; opacity: number };
  rain: number;
  wind: number;
  vinyl: number;
  /** 0 is day, 1 is deep night (stars out, the sun turns into a moon): a dark, muffled tone. */
  night: number;
  /** Cloud cover: the pad. */
  clouds: number;
  /** A flight of birds: the melody. */
  birds: number;
  landmarks: Landmark[];
  /** Per track: how loud (0..1), and which of the 16 steps are on (0 or 1). */
  tracks: { level: number; steps: number[] }[];
}

const norm = (value: number, { min, max }: { min: number; max: number }) => (max === min ? 0 : (value - min) / (max - min));
const lognorm = (value: number, { min, max }: { min: number; max: number }) => Math.log(value / min) / Math.log(max / min);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Circular mean of the chord roots, so C and B (a semitone apart) get neighboring hues. */
function keyHue(progression: readonly Chord[]): number {
  let x = 0;
  let y = 0;
  for (const { pc } of progression) {
    x += Math.cos((pc / 12) * 2 * Math.PI);
    y += Math.sin((pc / 12) * 2 * Math.PI);
  }
  return (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1;
}

/**
 * How strongly the song calls for each world. Ambience weighs most (rain is a city street, wind a
 * mountain), then the instrument voices (a guitar by a campfire in the woods, vibes by the sea).
 */
function worldScores(p: SongParams): Record<CoverWorld, number> {
  const drums = (p.drums.kick + p.drums.snare + p.drums.hat) / 3;
  return {
    city: p.ambience.rain * 1.1 + (p.keys.voice === "rhodes" ? 0.15 : 0) + (p.bass.voice === "synth" ? 0.2 : 0),
    sea: p.fx.reverb * 0.8 + (p.keys.voice === "vibes" ? 0.45 : 0) + (p.pad.voice === "air" ? p.pad.level * 0.3 : 0),
    mountains: p.ambience.wind * 1.3 + (p.pad.voice === "strings" ? p.pad.level * 0.6 : 0),
    forest: (p.keys.voice === "guitar" ? 0.55 : 0) + (p.lead.voice === "flute" ? p.lead.level * 0.4 : 0),
    desert: p.ambience.vinyl * 0.7 + (p.keys.voice === "organ" ? 0.4 : 0),
    fields: (p.keys.voice === "piano" ? 0.45 : 0) + (1 - drums) * 0.3,
  };
}

export function coverWorld(params: SongParams): CoverWorld {
  const scores = worldScores(params);
  return COVER_WORLDS.reduce((best, world) => (scores[world] > scores[best] ? world : best));
}

const trackLevel = (params: SongParams, track: (typeof TRACKS)[number]): number =>
  track === "keys" ? params.keys.level : track === "bass" ? params.bass.level : track === "lead" ? params.lead.level : params.drums[track];

export function coverScene(params: SongParams): CoverScene {
  const { keys, bass, fx, ambience, progression } = params;
  const lightness = clamp01(lognorm(fx.tone, RANGES.tone));
  return {
    world: coverWorld(params),
    // The key sets the color; tempo and brightness nudge it, so songs in one key still differ.
    hue: (keyHue(progression) + 0.25 * norm(params.bpm, RANGES.bpm) + 0.12 * lognorm(keys.cutoff, RANGES.keysCutoff)) % 1,
    drift: fx.reverb,
    lightness,
    saturation: clamp01(fx.warmth * 0.7 + keys.level * 0.3),
    sun: {
      x: norm(params.bpm, RANGES.bpm),
      size: keys.level,
      glow: clamp01(lognorm(keys.adsr.attack, RANGES.attack) * 0.5 + lognorm(keys.adsr.release, RANGES.release) * 0.5),
      opacity: clamp01(lognorm(keys.cutoff, RANGES.keysCutoff)),
    },
    wave: {
      amplitude: fx.wobble,
      rate: clamp01(lognorm(keys.lfoRate, RANGES.lfoRate)),
      depth: keys.lfoDepth,
      phase: params.swing,
      jitter: params.humanize,
      opacity: clamp01(bass.level * 0.6 + lognorm(bass.cutoff, RANGES.bassCutoff) * 0.4),
    },
    rain: ambience.rain,
    wind: ambience.wind,
    vinyl: ambience.vinyl,
    night: clamp01((0.75 - lightness) * 2.5),
    clouds: params.pad.level,
    birds: params.lead.level,
    landmarks: progression.map((chord) => ({
      height: chord.pc / 11,
      tint: CHORD_QUALITIES.indexOf(chord.quality) / (CHORD_QUALITIES.length - 1),
    })),
    tracks: TRACKS.map((track) => ({
      level: trackLevel(params, track),
      steps: Array.from({ length: STEPS }, (_, i) => (params.pattern[track][i] ? 1 : 0)),
    })),
  };
}

/** Leaf numbers of a scene (the world, a string, is compared separately), with hues compared around the circle. Used to measure similarity. */
function leaves(value: unknown, key = ""): { key: string; value: number }[] {
  if (typeof value === "number") return [{ key, value }];
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${key}[${i}]`));
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, key ? `${key}.${k}` : k));
  }
  return [];
}

/**
 * 0 (identical) to 1 (nothing in common). Skylines of different length are compared as if the
 * shorter one had flat bars, so adding a bar counts as a change.
 */
export function sceneDistance(a: CoverScene, b: CoverScene): number {
  const pad = (scene: CoverScene) => ({ ...scene, landmarks: Array.from({ length: 8 }, (_, i) => scene.landmarks[i] ?? { height: 0, tint: 0 }) });
  const left = leaves(pad(a));
  const right = new Map(leaves(pad(b)).map((leaf) => [leaf.key, leaf.value]));
  let total = 0;
  for (const { key, value } of left) {
    const other = right.get(key) ?? 0;
    const delta = Math.abs(value - other);
    total += key === "hue" ? Math.min(delta, 1 - delta) * 2 : delta;
  }
  // Another world is another picture: it counts like every number moving by a quarter.
  return total / left.length + (a.world === b.world ? 0 : 0.25);
}
