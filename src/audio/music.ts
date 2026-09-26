import type { Chord, ChordQuality } from "./types";

/** Semitones above the root of the notes played by the keys (the bass plays the root). */
const VOICINGS: Record<ChordQuality, number[]> = {
  m7: [3, 7, 10, 15],
  m9: [3, 7, 10, 14],
  m11: [7, 10, 14, 17],
  maj7: [4, 7, 11, 16],
  dom7: [4, 10, 14, 16],
  dom9: [4, 7, 10, 14],
  dom13: [4, 10, 14, 21],
};

export const QUALITY_SYMBOLS: Record<ChordQuality, string> = {
  m7: "m7",
  m9: "m9",
  m11: "m11",
  maj7: "maj7",
  dom7: "7",
  dom9: "9",
  dom13: "13",
};

export const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export const chordName = (chord: Chord) => `${NOTE_NAMES[chord.pc % 12]}${QUALITY_SYMBOLS[chord.quality]}`;

/** Keys voicing in Hz, kept in a warm mid register (C3..B3 root). */
export function chordFrequencies(chord: Chord): number[] {
  const root = 48 + (chord.pc % 12);
  return VOICINGS[chord.quality].map((interval) => midiToHz(root + interval));
}

/** Bass note in Hz, in C2..B2. */
export const bassFrequency = (chord: Chord, octaveShift = 0) => midiToHz(36 + (chord.pc % 12) + 12 * octaveShift);

/** MIDI notes of the keys voicing (same notes as `chordFrequencies`), and of the bass root. */
export const chordMidiNotes = (chord: Chord): { keys: number[]; bass: number } => ({
  keys: VOICINGS[chord.quality].map((interval) => 48 + (chord.pc % 12) + interval),
  bass: 36 + (chord.pc % 12),
});

/** Lowest cutoff of the keys' wobble: the LFO sweeps between this and `cutoff` (up to 3.5 octaves down). */
export const lfoFloor = (cutoff: number, depth: number) => Math.max(90, cutoff * 2 ** (-3.5 * depth));
