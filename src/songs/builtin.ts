import type { Song, SongParams } from "./types";
import { DEFAULT_PARAMS, PC, steps } from "./params";

/** The shared starting point of the built-in songs. */
const { volume: _volume, ...base } = DEFAULT_PARAMS;

type BuiltIn = { id: string; name: string; description: string; params: SongParams };

const definitions: BuiltIn[] = [
  {
    id: "rainy-study",
    name: "Rainy Study",
    description: "Soft keys, steady rain, warm vinyl.",
    params: {
      ...base,
      bpm: 75,
      swing: 0.5,
      ambience: { rain: 0.55, vinyl: 0.35, wind: 0 },
      fx: { tone: 4600, wobble: 0.3, warmth: 0.3, reverb: 0.28 },
    },
  },
  {
    id: "midnight-jazz",
    name: "Midnight Jazz",
    description: "ii-V-I keys, deep swing, crackle.",
    params: {
      ...base,
      bpm: 80,
      swing: 0.65,
      progression: [
        { pc: PC.C, quality: "maj7" },
        { pc: PC.A, quality: "m9" },
        { pc: PC.D, quality: "m9" },
        { pc: PC.G, quality: "dom13" },
      ],
      pattern: {
        kick: steps("x.....x...x....."),
        snare: steps("....x.......x..x"),
        hat: steps("x.xxx.xxx.xxx.xx"),
        bass: steps("x..x....x..x...."),
        keys: steps("x....x..x......."),
      },
      keys: { ...base.keys, wave: "triangle", cutoff: 3200, lfoDepth: 0.4 },
      ambience: { rain: 0, vinyl: 0.6, wind: 0.1 },
      fx: { tone: 5600, wobble: 0.35, warmth: 0.4, reverb: 0.3 },
    },
  },
  {
    id: "sunday-wind",
    name: "Sunday Wind",
    description: "Airy, slow chords, drifting wind.",
    params: {
      ...base,
      bpm: 78,
      swing: 0.35,
      progression: [
        { pc: PC.A, quality: "m9" },
        { pc: PC.F, quality: "maj7" },
        { pc: PC.C, quality: "maj7" },
        { pc: PC.E, quality: "dom7" },
      ],
      pattern: {
        kick: steps("x.......x......."),
        snare: steps("....x.......x..."),
        hat: steps("x...x...x...x..."),
        bass: steps("x.......x.....x."),
        keys: steps("x.......x......."),
      },
      keys: { ...base.keys, level: 0.6, adsr: { attack: 0.08, decay: 1.5, sustain: 0.4, release: 2 }, cutoff: 2200, lfoRate: 0.15 },
      ambience: { rain: 0, vinyl: 0.25, wind: 0.6 },
      fx: { tone: 5000, wobble: 0.2, warmth: 0.2, reverb: 0.4 },
    },
  },
  {
    id: "tape-cafe",
    name: "Tape Café",
    description: "Worn tape, wobbly keys, busy groove.",
    params: {
      ...base,
      bpm: 85,
      swing: 0.55,
      progression: [
        { pc: PC.Eb, quality: "maj7" },
        { pc: PC.C, quality: "m9" },
        { pc: PC.F, quality: "m9" },
        { pc: PC.Bb, quality: "dom13" },
      ],
      pattern: {
        kick: steps("x.....x..x.....x"),
        snare: steps("....x.......x..."),
        hat: steps("x.x.x.xxx.x.x.xx"),
        bass: steps("x..x..x...x..x.."),
        keys: steps("x..x....x..x...."),
      },
      keys: { ...base.keys, wave: "triangle", lfoRate: 0.6, lfoDepth: 0.55, cutoff: 2400 },
      ambience: { rain: 0.15, vinyl: 0.5, wind: 0 },
      fx: { tone: 3800, wobble: 0.6, warmth: 0.5, reverb: 0.2 },
    },
  },
];


/** Ships with the app; never saved to the config file. */
export const BUILT_IN_SONGS: Song[] = definitions.map((d) => ({ ...d, createdAt: 0, builtIn: true }));
