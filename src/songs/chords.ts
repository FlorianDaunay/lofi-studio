import { NOTE_NAMES, QUALITY_SYMBOLS } from "@/audio/music";
import { CHORD_QUALITIES, type Chord, type ChordQuality } from "@/audio/types";

/** One chord per bar; a progression is 1 to 8 bars long. */
export const MIN_BARS = 1;
export const MAX_BARS = 8;

/** Plain-language names for the chord qualities, for people who do not read chord symbols yet. */
export const QUALITY_INFO: Record<ChordQuality, { label: string; mood: string }> = {
  m7: { label: "Minor 7", mood: "Mellow and a little sad. The classic lo-fi color." },
  m9: { label: "Minor 9", mood: "Softer and dreamier than minor 7." },
  m11: { label: "Minor 11", mood: "Open and floating, no clear direction." },
  maj7: { label: "Major 7", mood: "Warm, calm, contented." },
  dom7: { label: "Dominant 7", mood: "Tense and bluesy: it wants to move to the next chord." },
  dom9: { label: "Dominant 9", mood: "Tension with a smoother, rounder edge." },
  dom13: { label: "Dominant 13", mood: "Rich jazz tension, the sound of a late-night piano bar." },
};

/** Root names as offered in the editor (`pc` 0 to 11). */
export const ROOTS: readonly { pc: number; name: string }[] = NOTE_NAMES.map((name, pc) => ({ pc, name }));

const ROOT_PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

const QUALITY_FROM_SYMBOL = Object.fromEntries(CHORD_QUALITIES.map((q) => [QUALITY_SYMBOLS[q], q])) as Record<string, ChordQuality>;

/** `"Dm9"`, `"G13"`, `"Bbmaj7"` to a chord. Throws on anything else: it is meant for hand-written data. */
export function parseChord(text: string): Chord {
  const match = /^([A-G][b#]?)(.+)$/.exec(text);
  const pc = match ? ROOT_PC[match[1]!] : undefined;
  const quality = match ? QUALITY_FROM_SYMBOL[match[2]!] : undefined;
  if (pc === undefined || quality === undefined) throw new Error(`Unknown chord "${text}"`);
  return { pc, quality };
}

/** `"Dm9 G13 Cmaj7 A7"` to a progression. */
export const parseProgression = (text: string): Chord[] => text.trim().split(/\s+/).map(parseChord);

/** The progression with one chord partly replaced. */
export const withChord = (progression: readonly Chord[], index: number, patch: Partial<Chord>): Chord[] =>
  progression.map((chord, i) => (i === index ? { ...chord, ...patch } : chord));

/** A new bar at the end, repeating the last chord (an easy starting point to edit). */
export function withBarAdded(progression: readonly Chord[]): Chord[] {
  const last = progression.at(-1);
  return progression.length >= MAX_BARS || !last ? [...progression] : [...progression, { ...last }];
}

export const withBarRemoved = (progression: readonly Chord[], index: number): Chord[] =>
  progression.length <= MIN_BARS ? [...progression] : progression.filter((_, i) => i !== index);
