import { parseProgression } from "./chords";
import { DEFAULT_PARAMS, steps } from "./params";
import type { Song, SongParams } from "./types";

/**
 * The songs that ship with the app. The first four are pinned on a fresh install, so they cover the
 * main moods: rain, jazz, wind, tape. Every song starts from the same defaults and overrides what
 * gives it its character.
 */
const { volume: _volume, ...base } = DEFAULT_PARAMS;

interface Definition {
  id: string;
  name: string;
  description: string;
  bpm: number;
  swing: number;
  /** Chord symbols, one per bar: `"Dm9 G13 Cmaj7 A7"`. */
  chords: string;
  /** 16 steps per track, `x` = hit. */
  pattern: { kick: string; snare: string; hat: string; bass: string; keys: string };
  ambience: { rain: number; vinyl: number; wind: number };
  fx: SongParams["fx"];
  keys?: Partial<SongParams["keys"]>;
  drums?: Partial<SongParams["drums"]>;
  humanize?: number;
}

function build(d: Definition): Song {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    createdAt: 0,
    builtIn: true,
    params: {
      ...base,
      bpm: d.bpm,
      swing: d.swing,
      humanize: d.humanize ?? base.humanize,
      progression: parseProgression(d.chords),
      pattern: {
        kick: steps(d.pattern.kick),
        snare: steps(d.pattern.snare),
        hat: steps(d.pattern.hat),
        bass: steps(d.pattern.bass),
        keys: steps(d.pattern.keys),
      },
      keys: { ...base.keys, ...d.keys },
      drums: { ...base.drums, ...d.drums },
      ambience: d.ambience,
      fx: d.fx,
    },
  };
}

const definitions: Definition[] = [
  {
    id: "rainy-study",
    name: "Rainy Study",
    description: "Soft keys, steady rain, warm vinyl.",
    bpm: 75,
    swing: 0.5,
    chords: "Dm9 G13 Cmaj7 A7",
    pattern: { kick: "x......x..x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x..x...x.....", keys: "x......x..x....." },
    ambience: { rain: 0.55, vinyl: 0.35, wind: 0 },
    fx: { tone: 4600, wobble: 0.3, warmth: 0.3, reverb: 0.28 },
  },
  {
    id: "midnight-jazz",
    name: "Midnight Jazz",
    description: "ii-V-I keys, deep swing, crackle.",
    bpm: 80,
    swing: 0.65,
    chords: "Cmaj7 Am9 Dm9 G13",
    pattern: { kick: "x.....x...x.....", snare: "....x.......x..x", hat: "x.xxx.xxx.xxx.xx", bass: "x..x....x..x....", keys: "x....x..x......." },
    ambience: { rain: 0, vinyl: 0.6, wind: 0.1 },
    fx: { tone: 5600, wobble: 0.35, warmth: 0.4, reverb: 0.3 },
    keys: { wave: "triangle", cutoff: 3200, lfoDepth: 0.4 },
  },
  {
    id: "sunday-wind",
    name: "Sunday Wind",
    description: "Airy, slow chords, drifting wind.",
    bpm: 78,
    swing: 0.35,
    chords: "Am9 Fmaj7 Cmaj7 E7",
    pattern: { kick: "x.......x.......", snare: "....x.......x...", hat: "x...x...x...x...", bass: "x.......x.....x.", keys: "x.......x......." },
    ambience: { rain: 0, vinyl: 0.25, wind: 0.6 },
    fx: { tone: 5000, wobble: 0.2, warmth: 0.2, reverb: 0.4 },
    keys: { level: 0.6, adsr: { attack: 0.08, decay: 1.5, sustain: 0.4, release: 2 }, cutoff: 2200, lfoRate: 0.15 },
  },
  {
    id: "tape-cafe",
    name: "Tape Café",
    description: "Worn tape, wobbly keys, busy groove.",
    bpm: 85,
    swing: 0.55,
    chords: "Ebmaj7 Cm9 Fm9 Bb13",
    pattern: { kick: "x.....x..x.....x", snare: "....x.......x...", hat: "x.x.x.xxx.x.x.xx", bass: "x..x..x...x..x..", keys: "x..x....x..x...." },
    ambience: { rain: 0.15, vinyl: 0.5, wind: 0 },
    fx: { tone: 3800, wobble: 0.6, warmth: 0.5, reverb: 0.2 },
    keys: { wave: "triangle", lfoRate: 0.6, lfoDepth: 0.55, cutoff: 2400 },
  },
  {
    id: "slow-sunrise",
    name: "Slow Sunrise",
    description: "Sparse and bright, like the first coffee.",
    bpm: 72,
    swing: 0.3,
    chords: "Fmaj7 Em7 Dm9 G13",
    pattern: { kick: "x.......x.......", snare: "........x.......", hat: "x...x...x...x...", bass: "x...............", keys: "x.......x......." },
    ambience: { rain: 0, vinyl: 0.3, wind: 0.3 },
    fx: { tone: 6000, wobble: 0.15, warmth: 0.2, reverb: 0.4 },
    keys: { level: 0.6, adsr: { attack: 0.12, decay: 1.6, sustain: 0.5, release: 2.4 }, cutoff: 3400, lfoRate: 0.12, lfoDepth: 0.25 },
    drums: { kick: 0.7, snare: 0.5, hat: 0.4 },
  },
  {
    id: "neon-rain",
    name: "Neon Rain",
    description: "Wet city streets, busy hats, wobbling keys.",
    bpm: 82,
    swing: 0.5,
    chords: "Gm9 C13 Fmaj7 Bbmaj7",
    pattern: { kick: "x.....x..x......", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", bass: "x..x....x.x.....", keys: "x...x.....x....." },
    ambience: { rain: 0.7, vinyl: 0.2, wind: 0 },
    fx: { tone: 4200, wobble: 0.5, warmth: 0.4, reverb: 0.35 },
    keys: { wave: "triangle", cutoff: 2600, lfoRate: 0.5, lfoDepth: 0.5 },
    drums: { hat: 0.35 },
  },
  {
    id: "library-hush",
    name: "Library Hush",
    description: "Barely there drums, room to think.",
    bpm: 70,
    swing: 0.4,
    chords: "Em9 A13 Dmaj7 Bm7",
    pattern: { kick: "x...............", snare: "........x.......", hat: "..x...x...x...x.", bass: "x.......x.......", keys: "x.......x......." },
    ambience: { rain: 0, vinyl: 0.5, wind: 0.05 },
    fx: { tone: 4000, wobble: 0.2, warmth: 0.3, reverb: 0.45 },
    keys: { level: 0.5, cutoff: 2200, lfoDepth: 0.2 },
    drums: { kick: 0.5, snare: 0.4, hat: 0.4 },
    humanize: 0.5,
  },
  {
    id: "train-window",
    name: "Train Window",
    description: "Steady kick, fields rolling past in the rain.",
    bpm: 84,
    swing: 0.6,
    chords: "Bbmaj7 Gm9 Cm9 F13",
    pattern: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.xx", bass: "x.....x.x.....x.", keys: "x.....x.....x..." },
    ambience: { rain: 0.25, vinyl: 0.15, wind: 0.3 },
    fx: { tone: 4800, wobble: 0.3, warmth: 0.3, reverb: 0.25 },
    drums: { kick: 0.75 },
  },
  {
    id: "late-bus-home",
    name: "Late Bus Home",
    description: "Heavy crackle, tired swing, sleepy chords.",
    bpm: 76,
    swing: 0.62,
    chords: "Am9 D13 Gmaj7 Cmaj7",
    pattern: { kick: "x.....x...x.....", snare: "....x.......x...", hat: "x...x...x...x.x.", bass: "x.....x..x......", keys: "x.....x......x.." },
    ambience: { rain: 0, vinyl: 0.75, wind: 0.1 },
    fx: { tone: 3600, wobble: 0.45, warmth: 0.5, reverb: 0.3 },
    keys: { lfoRate: 0.35, lfoDepth: 0.4, cutoff: 2300 },
  },
  {
    id: "cozy-blanket",
    name: "Cozy Blanket",
    description: "Muffled, warm and slow. Everything wrapped up.",
    bpm: 72,
    swing: 0.45,
    chords: "Cmaj7 Fmaj7 Em7 A7",
    pattern: { kick: "x.......x..x....", snare: "....x.......x...", hat: "x.x...x.x.x...x.", bass: "x.......x.......", keys: "x.......x..x...." },
    ambience: { rain: 0.2, vinyl: 0.4, wind: 0 },
    fx: { tone: 3200, wobble: 0.35, warmth: 0.6, reverb: 0.35 },
    keys: { level: 0.6, cutoff: 1900, adsr: { attack: 0.05, decay: 1.4, sustain: 0.4, release: 1.8 } },
  },
  {
    id: "vinyl-sunday",
    name: "Vinyl Sunday",
    description: "A dusty record and the slowest afternoon.",
    bpm: 76,
    swing: 0.55,
    chords: "Dm9 Bbmaj7 Fmaj7 C13",
    pattern: { kick: "x..x......x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x......x.....", keys: "x.....x.....x..." },
    ambience: { rain: 0, vinyl: 0.85, wind: 0 },
    fx: { tone: 4400, wobble: 0.4, warmth: 0.45, reverb: 0.2 },
    keys: { wave: "triangle", cutoff: 2800 },
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    description: "Half-time pulse and low bass to lock in.",
    bpm: 80,
    swing: 0.35,
    chords: "Cm9 F13 Bbmaj7 Ebmaj7",
    pattern: { kick: "x.......x.x.....", snare: "........x.......", hat: "x.x.x.x.x.x.x.x.", bass: "x.......x.x.....", keys: "x.......x......." },
    ambience: { rain: 0.25, vinyl: 0.2, wind: 0.15 },
    fx: { tone: 4600, wobble: 0.2, warmth: 0.35, reverb: 0.25 },
    keys: { level: 0.5, cutoff: 2400, lfoDepth: 0.25 },
    drums: { kick: 1, snare: 0.6, hat: 0.45 },
  },
];

/** Ships with the app; never saved to the config file. */
export const BUILT_IN_SONGS: Song[] = definitions.map(build);
