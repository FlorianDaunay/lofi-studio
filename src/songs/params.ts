import { AMBIENCE_LAYERS, STEPS, type AmbienceParams, type EngineParams, type Pattern } from "@/audio/types";
import { parseProgression } from "./chords";
import { autoLoops } from "./playback";

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
  perc: Array<boolean>(STEPS).fill(false),
  bass: Array<boolean>(STEPS).fill(false),
  keys: Array<boolean>(STEPS).fill(false),
  lead: Array<boolean>(STEPS).fill(false),
});

export const DEFAULT_PROGRESSION = parseProgression("Dm9 G13 Cmaj7 A7");

const DEFAULT_BPM = 78;

/** Every ambience layer off: songs only list the layers they use. */
export const SILENT_AMBIENCE = Object.fromEntries(AMBIENCE_LAYERS.map((id) => [id, 0])) as AmbienceParams;

export const DEFAULT_PARAMS: EngineParams = {
  bpm: DEFAULT_BPM,
  transpose: 0,
  swing: 0.45,
  humanize: 0.4,
  volume: 0.8,
  loops: autoLoops({ bpm: DEFAULT_BPM, progression: DEFAULT_PROGRESSION }),
  pattern: {
    kick: steps("x......x..x....."),
    snare: steps("....x.......x..."),
    hat: steps("x.x.x.x.x.x.x.x."),
    perc: steps("................"),
    bass: steps("x..x..x...x....."),
    keys: steps("x......x..x....."),
    lead: steps("................"),
  },
  progression: DEFAULT_PROGRESSION,
  keys: {
    level: 0.55,
    voice: "rhodes",
    wave: "sine",
    adsr: { attack: 0.01, decay: 1.2, sustain: 0.25, release: 1.2 },
    cutoff: 2600,
    lfoRate: 0.25,
    lfoDepth: 0.3,
  },
  bass: {
    level: 0.7,
    voice: "sub",
    wave: "sine",
    adsr: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.25 },
    cutoff: 420,
  },
  drums: { kit: "boombap", kick: 0.9, snare: 0.7, hat: 0.6, perc: 0.6, percVoice: "shaker" },
  // Off by default (like the percussion row, crush, pump and the newer ambience layers), so songs saved before them sound exactly as they did.
  pad: { level: 0, voice: "warm", attack: 1.2, cutoff: 1800 },
  lead: { level: 0, voice: "flute", echo: 0.3 },
  fx: { tone: 5200, wobble: 0.25, warmth: 0.3, reverb: 0.22, crush: 0, pump: 0 },
  ambience: { ...SILENT_AMBIENCE, rain: 0.3, vinyl: 0.4 },
};

