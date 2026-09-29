/** Min / max / step of every numeric control: shared by the sliders and the config sanitizer. */
export const RANGES = {
  bpm: { min: 60, max: 100, step: 1 },
  /** Loops per song (see `songs/playback.ts`). */
  loops: { min: 1, max: 32, step: 1 },
  swing: { min: 0, max: 1, step: 0.01 },
  humanize: { min: 0, max: 1, step: 0.01 },
  volume: { min: 0, max: 1, step: 0.01 },
  level: { min: 0, max: 1, step: 0.01 },
  attack: { min: 0.001, max: 2, step: 0.001 },
  decay: { min: 0.01, max: 3, step: 0.01 },
  sustain: { min: 0, max: 1, step: 0.01 },
  release: { min: 0.01, max: 4, step: 0.01 },
  keysCutoff: { min: 300, max: 8000, step: 10 },
  bassCutoff: { min: 80, max: 1500, step: 5 },
  lfoRate: { min: 0.05, max: 8, step: 0.05 },
  lfoDepth: { min: 0, max: 1, step: 0.01 },
  padAttack: { min: 0.05, max: 4, step: 0.05 },
  padCutoff: { min: 300, max: 6000, step: 10 },
  tone: { min: 500, max: 12000, step: 50 },
  amount: { min: 0, max: 1, step: 0.01 },
} as const;

export const clamp = (value: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, value));
