import { CHORD_QUALITIES, STEPS, TRACKS, WAVEFORMS, type Chord, type EngineParams, type Pattern } from "@/audio";
import { DEFAULT_PARAMS } from "./defaults";
import { RANGES, clamp } from "./ranges";

export const PANEL_IDS = ["sequencer", "instruments", "effects"] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export const DEFAULT_PANELS: Record<PanelId, boolean> = { sequencer: false, instruments: false, effects: false };

/** What is saved on disk between sessions. */
export interface PersistedConfig {
  version: 1;
  params: EngineParams;
  presetId: string | null;
  panels: Record<PanelId, boolean>;
}

type Range = { min: number; max: number };
type AdsrParams = EngineParams["keys"]["adsr"];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, range: Range) =>
  typeof v === "number" && Number.isFinite(v) ? clamp(v, range) : fallback;
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

function adsr(v: unknown, d: AdsrParams): AdsrParams {
  const r = isRecord(v) ? v : {};
  return {
    attack: num(r.attack, d.attack, RANGES.attack),
    decay: num(r.decay, d.decay, RANGES.decay),
    sustain: num(r.sustain, d.sustain, RANGES.sustain),
    release: num(r.release, d.release, RANGES.release),
  };
}

function pattern(v: unknown, d: Pattern): Pattern {
  const r = isRecord(v) ? v : {};
  const row = (id: (typeof TRACKS)[number]) => {
    const value = r[id];
    return Array.isArray(value) && value.length === STEPS ? value.map(Boolean) : d[id];
  };
  return Object.fromEntries(TRACKS.map((id) => [id, row(id)])) as Pattern;
}

function progression(v: unknown, d: Chord[]): Chord[] {
  if (!Array.isArray(v) || v.length < 1 || v.length > 8) return d;
  const chords: Chord[] = [];
  for (const c of v) {
    if (!isRecord(c) || typeof c.pc !== "number" || !Number.isInteger(c.pc)) return d;
    if (!CHORD_QUALITIES.includes(c.quality as Chord["quality"])) return d;
    chords.push({ pc: ((c.pc % 12) + 12) % 12, quality: c.quality as Chord["quality"] });
  }
  return chords;
}

/** Turns untrusted JSON (a hand-edited or older file) into valid engine params, field by field. */
export function sanitizeParams(raw: unknown, d: EngineParams = DEFAULT_PARAMS): EngineParams {
  const r = isRecord(raw) ? raw : {};
  const keys = isRecord(r.keys) ? r.keys : {};
  const bass = isRecord(r.bass) ? r.bass : {};
  const drums = isRecord(r.drums) ? r.drums : {};
  const fx = isRecord(r.fx) ? r.fx : {};
  const amb = isRecord(r.ambience) ? r.ambience : {};
  return {
    bpm: num(r.bpm, d.bpm, RANGES.bpm),
    swing: num(r.swing, d.swing, RANGES.swing),
    humanize: num(r.humanize, d.humanize, RANGES.humanize),
    volume: num(r.volume, d.volume, RANGES.volume),
    pattern: pattern(r.pattern, d.pattern),
    progression: progression(r.progression, d.progression),
    keys: {
      level: num(keys.level, d.keys.level, RANGES.level),
      wave: oneOf(keys.wave, WAVEFORMS, d.keys.wave),
      adsr: adsr(keys.adsr, d.keys.adsr),
      cutoff: num(keys.cutoff, d.keys.cutoff, RANGES.keysCutoff),
      lfoRate: num(keys.lfoRate, d.keys.lfoRate, RANGES.lfoRate),
      lfoDepth: num(keys.lfoDepth, d.keys.lfoDepth, RANGES.lfoDepth),
    },
    bass: {
      level: num(bass.level, d.bass.level, RANGES.level),
      wave: oneOf(bass.wave, WAVEFORMS, d.bass.wave),
      adsr: adsr(bass.adsr, d.bass.adsr),
      cutoff: num(bass.cutoff, d.bass.cutoff, RANGES.bassCutoff),
    },
    drums: {
      kick: num(drums.kick, d.drums.kick, RANGES.level),
      snare: num(drums.snare, d.drums.snare, RANGES.level),
      hat: num(drums.hat, d.drums.hat, RANGES.level),
    },
    fx: {
      tone: num(fx.tone, d.fx.tone, RANGES.tone),
      wobble: num(fx.wobble, d.fx.wobble, RANGES.amount),
      warmth: num(fx.warmth, d.fx.warmth, RANGES.amount),
      reverb: num(fx.reverb, d.fx.reverb, RANGES.amount),
    },
    ambience: {
      rain: num(amb.rain, d.ambience.rain, RANGES.level),
      vinyl: num(amb.vinyl, d.ambience.vinyl, RANGES.level),
      wind: num(amb.wind, d.ambience.wind, RANGES.level),
    },
  };
}

export function sanitizeConfig(raw: unknown): PersistedConfig {
  const r = isRecord(raw) ? raw : {};
  const panels = isRecord(r.panels) ? r.panels : {};
  return {
    version: 1,
    params: sanitizeParams(r.params),
    presetId: typeof r.presetId === "string" ? r.presetId : null,
    panels: Object.fromEntries(PANEL_IDS.map((id) => [id, panels[id] === true])) as Record<PanelId, boolean>,
  };
}
