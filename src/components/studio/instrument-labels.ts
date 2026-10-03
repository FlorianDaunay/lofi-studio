import type { BassVoice, DrumKit, KeysVoice, LeadVoice, PadVoice, PercVoice } from "@/audio";

/** Display names of the instrument voices, in the order the pickers show them. */
export const KEYS_VOICE_OPTIONS: readonly { value: KeysVoice; label: string }[] = [
  { value: "rhodes", label: "E-piano" },
  { value: "piano", label: "Felt piano" },
  { value: "organ", label: "Organ" },
  { value: "guitar", label: "Guitar" },
  { value: "vibes", label: "Vibes" },
  { value: "wurli", label: "Wurli" },
  { value: "kalimba", label: "Kalimba" },
];

export const BASS_VOICE_OPTIONS: readonly { value: BassVoice; label: string }[] = [
  { value: "sub", label: "Sub" },
  { value: "upright", label: "Upright" },
  { value: "synth", label: "Synth" },
  { value: "fretless", label: "Fretless" },
];

export const DRUM_KIT_OPTIONS: readonly { value: DrumKit; label: string }[] = [
  { value: "boombap", label: "Boom bap" },
  { value: "brushes", label: "Brushes" },
  { value: "deep", label: "Deep 808" },
  { value: "dusty", label: "Dusty" },
];

export const PAD_VOICE_OPTIONS: readonly { value: PadVoice; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "strings", label: "Strings" },
  { value: "air", label: "Air" },
];

export const LEAD_VOICE_OPTIONS: readonly { value: LeadVoice; label: string }[] = [
  { value: "flute", label: "Flute" },
  { value: "musicbox", label: "Music box" },
  { value: "square", label: "Square" },
  { value: "trumpet", label: "Muted trumpet" },
  { value: "whistle", label: "Whistle" },
];

export const PERC_VOICE_OPTIONS: readonly { value: PercVoice; label: string }[] = [
  { value: "shaker", label: "Shaker" },
  { value: "rim", label: "Rim" },
  { value: "conga", label: "Congas" },
  { value: "clap", label: "Claps" },
];
