export const STEPS = 16;

export const TRACKS = ["kick", "snare", "hat", "perc", "bass", "keys", "lead"] as const;
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

/** Instrument voices. Each changes how an instrument is synthesized, not what it plays. */
export const KEYS_VOICES = ["rhodes", "piano", "organ", "guitar", "vibes", "wurli", "kalimba"] as const;
export type KeysVoice = (typeof KEYS_VOICES)[number];
export const BASS_VOICES = ["sub", "upright", "synth", "fretless"] as const;
export type BassVoice = (typeof BASS_VOICES)[number];
export const DRUM_KITS = ["boombap", "brushes", "deep", "dusty"] as const;
export type DrumKit = (typeof DRUM_KITS)[number];
export const PAD_VOICES = ["warm", "strings", "air"] as const;
export type PadVoice = (typeof PAD_VOICES)[number];
export const LEAD_VOICES = ["flute", "musicbox", "square", "trumpet", "whistle"] as const;
export type LeadVoice = (typeof LEAD_VOICES)[number];
/** Hand percussion on its own row of the pattern ("perc"). */
export const PERC_VOICES = ["shaker", "rim", "conga", "clap"] as const;
export type PercVoice = (typeof PERC_VOICES)[number];

export interface KeysParams {
  level: number;
  voice: KeysVoice;
  /** Carrier waveform; only the voices built on an oscillator use it (see `KEYS_VOICE_USES_WAVE`). */
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
  voice: BassVoice;
  wave: Waveform;
  adsr: Adsr;
  cutoff: number;
}

export interface DrumsParams {
  kit: DrumKit;
  kick: number;
  snare: number;
  hat: number;
  /** Level of the percussion row; songs without hits on it are silent whatever the level. */
  perc: number;
  percVoice: PercVoice;
}

/** Sustained chords under the keys: one long note per bar, no pattern. `level` 0 turns it off. */
export interface PadParams {
  level: number;
  voice: PadVoice;
  /** Seconds to fade in. */
  attack: number;
  cutoff: number;
}

/** A melody on the chord tones, played on the "lead" row of the pattern. */
export interface LeadParams {
  level: number;
  voice: LeadVoice;
  /** Dotted-eighth echo, 0..1. */
  echo: number;
}

export interface FxParams {
  /** Master low-pass in Hz: the "muffled" lo-fi tone. */
  tone: number;
  /** Tape wow/flutter amount, 0..1. */
  wobble: number;
  /** Soft saturation, 0..1. */
  warmth: number;
  reverb: number;
  /** Bit-depth reduction, 0..1 (0 is clean). */
  crush: number;
  /** Sidechain "pump": how far the music ducks under each kick, 0..1. */
  pump: number;
}

/** Background layers, each with its own level (0 = off). The order is the order of the pickers. */
export const AMBIENCE_LAYERS = [
  "rain",
  "wind",
  "thunder",
  "waves",
  "stream",
  "chimes",
  "birds",
  "crickets",
  "frogs",
  "leaves",
  "vinyl",
  "fire",
  "clock",
  "city",
  "train",
] as const;
export type AmbienceLayerId = (typeof AMBIENCE_LAYERS)[number];
export type AmbienceParams = Record<AmbienceLayerId, number>;

/** Everything the audio engine needs to sound; the UI store owns it, the engine only reads it. */
export interface EngineParams {
  bpm: number;
  /** Semitones the whole song is shifted by (its key), without rewriting the chords. */
  transpose: number;
  /** 0..1 */
  swing: number;
  /** Random timing/velocity looseness, 0..1. */
  humanize: number;
  volume: number;
  /**
   * How many times the loop plays before the player moves on to the next song. The engine
   * itself loops forever and ignores it: only the player reads it.
   */
  loops: number;
  pattern: Pattern;
  progression: Chord[];
  keys: KeysParams;
  bass: BassParams;
  drums: DrumsParams;
  pad: PadParams;
  lead: LeadParams;
  fx: FxParams;
  ambience: AmbienceParams;
}

/** Keys voices whose tone follows the waveform setting (the others have a fixed timbre). */
export const KEYS_VOICE_USES_WAVE: Record<KeysVoice, boolean> = {
  rhodes: true,
  piano: false,
  organ: false,
  guitar: false,
  vibes: true,
  wurli: true,
  kalimba: false,
};
export const BASS_VOICE_USES_WAVE: Record<BassVoice, boolean> = { sub: true, upright: false, synth: true, fretless: false };
