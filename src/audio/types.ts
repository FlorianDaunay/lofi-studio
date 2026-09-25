export const STEPS = 16;

export const TRACKS = ["kick", "snare", "hat", "bass", "keys"] as const;
export type TrackId = (typeof TRACKS)[number];

/** One boolean per step, per track. */
export type Pattern = Record<TrackId, boolean[]>;

export const WAVEFORMS = ["sine", "triangle", "square", "sawtooth"] as const;
export type Waveform = (typeof WAVEFORMS)[number];

export interface Adsr {
  /** Seconds. */
  attack: number;
  decay: number;
  /** 0..1 */
  sustain: number;
  release: number;
}

export const CHORD_QUALITIES = ["m7", "m9", "m11", "maj7", "dom7", "dom9", "dom13"] as const;
export type ChordQuality = (typeof CHORD_QUALITIES)[number];

export interface Chord {
  /** Pitch class of the root: 0 = C ... 11 = B. */
  pc: number;
  quality: ChordQuality;
}

export interface KeysParams {
  level: number;
  wave: Waveform;
  adsr: Adsr;
  /** Low-pass ceiling in Hz. */
  cutoff: number;
  /** Wobble speed in Hz. */
  lfoRate: number;
  /** 0..1: how far the LFO pulls the cutoff down. */
  lfoDepth: number;
}

export interface BassParams {
  level: number;
  wave: Waveform;
  adsr: Adsr;
  cutoff: number;
}

export interface DrumsParams {
  kick: number;
  snare: number;
  hat: number;
}

export interface FxParams {
  /** Master low-pass in Hz: the "muffled" lo-fi tone. */
  tone: number;
  /** Tape wow/flutter amount, 0..1. */
  wobble: number;
  /** Soft saturation, 0..1. */
  warmth: number;
  reverb: number;
}

export interface AmbienceParams {
  rain: number;
  vinyl: number;
  wind: number;
}

/** Everything the audio engine needs to sound; the UI store owns it, the engine only reads it. */
export interface EngineParams {
  bpm: number;
  /** 0..1 */
  swing: number;
  /** Random timing/velocity looseness, 0..1. */
  humanize: number;
  volume: number;
  pattern: Pattern;
  progression: Chord[];
  keys: KeysParams;
  bass: BassParams;
  drums: DrumsParams;
  fx: FxParams;
  ambience: AmbienceParams;
}
