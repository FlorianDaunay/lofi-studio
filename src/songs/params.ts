import type { EngineParams, Pattern } from "@/audio/types";
import { STEPS } from "@/audio/types";
import { parseProgression } from "./chords";

/** `"x..x"` style pattern: `x` is a hit, anything else a rest. */
export function steps(text: string): boolean[] {
  const cells = text.replace(/\s/g, "");
  if (cells.length !== STEPS) throw new Error(`A pattern needs ${STEPS} steps, got ${cells.length}: "${text}"`);
  return [...cells].map((c) => c === "x");
}

export const emptyPattern = (): Pattern => ({
  kick: Array<boolean>(STEPS).fill(false),
  snare: Array<boolean>(STEPS).fill(false),
  hat: Array<boolean>(STEPS).fill(false),
  bass: Array<boolean>(STEPS).fill(false),
  keys: Array<boolean>(STEPS).fill(false),
});

export const DEFAULT_PROGRESSION = parseProgression("Dm9 G13 Cmaj7 A7");

export const DEFAULT_PARAMS: EngineParams = {
  bpm: 78,
  swing: 0.45,
  humanize: 0.4,
  volume: 0.8,
  pattern: {
    kick: steps("x......x..x....."),
    snare: steps("....x.......x..."),
    hat: steps("x.x.x.x.x.x.x.x."),
    bass: steps("x..x..x...x....."),
    keys: steps("x......x..x....."),
  },
  progression: DEFAULT_PROGRESSION,
  keys: {
    level: 0.55,
    wave: "sine",
    adsr: { attack: 0.01, decay: 1.2, sustain: 0.25, release: 1.2 },
    cutoff: 2600,
    lfoRate: 0.25,
    lfoDepth: 0.3,
  },
  bass: {
    level: 0.7,
    wave: "sine",
    adsr: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.25 },
    cutoff: 420,
  },
  drums: { kick: 0.9, snare: 0.7, hat: 0.6 },
  fx: { tone: 5200, wobble: 0.25, warmth: 0.3, reverb: 0.22 },
  ambience: { rain: 0.3, vinyl: 0.4, wind: 0 },
};

