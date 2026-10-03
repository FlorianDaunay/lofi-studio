import { AMBIENCE_LAYERS, type AmbienceParams } from "@/audio/types";
import { SILENT_AMBIENCE } from "./params";
import { RANGES } from "./ranges";
import { dayKey, type DayStats, type Stats } from "./stats";
import type { SongParams } from "./types";

/**
 * What the stats page shows, derived from the stored totals. Pure, so every number on the
 * dashboard is covered by a test.
 */

export const STATS_RANGES = ["week", "month", "quarter", "year"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];
export const RANGE_DAYS: Record<StatsRange, number> = { week: 7, month: 30, quarter: 90, year: 365 };

/** A day counts towards a streak once this much happened in it. */
export const ACTIVE_DAY_SECONDS = 60;

/** The day keys of the `count` days ending `daysBack` days before `today`, oldest first. */
export function dayKeys(today: Date, count: number, daysBack = 0): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBack - (count - 1 - i));
    return dayKey(date);
  });
}

/** The local date of a day key (noon, so time-zone shifts never move it to another day). */
export function keyDate(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export interface DayPoint {
  /** Day key of the first day of the point. */
  key: string;
  /** Number of days summed into this point (1, or 7 for weekly points). */
  days: number;
  listen: number;
  create: number;
  plays: number;
}

/** One point per day, or per `bucket` days for long ranges (so a year stays readable). */
export function activitySeries(stats: Stats, keys: readonly string[], bucket = 1): DayPoint[] {
  const points: DayPoint[] = [];
  keys.forEach((key, i) => {
    const day = stats.days[key];
    if (i % bucket === 0) points.push({ key, days: 0, listen: 0, create: 0, plays: 0 });
    const point = points.at(-1);
    if (!point) return;
    point.days++;
    point.listen += day?.listen ?? 0;
    point.create += day?.create ?? 0;
    point.plays += day?.plays ?? 0;
  });
  return points;
}

export interface RangeSummary {
  listen: number;
  create: number;
  plays: number;
  /** Days with some activity. */
  activeDays: number;
  /** Listening per song id. */
  songs: Record<string, number>;
  /** Listening per source. */
  sources: Record<string, number>;
  /** Listening per weekday (0 = Monday) and hour: `week[weekday][hour]`. */
  week: number[][];
}

const addAll = (into: Record<string, number>, from: Record<string, number>) => {
  for (const [key, value] of Object.entries(from)) into[key] = (into[key] ?? 0) + value;
};

/** Everything that happened on the given days. */
export function summarize(stats: Stats, keys: readonly string[]): RangeSummary {
  const summary: RangeSummary = {
    listen: 0,
    create: 0,
    plays: 0,
    activeDays: 0,
    songs: {},
    sources: {},
    week: Array.from({ length: 7 }, () => Array<number>(24).fill(0)),
  };
  for (const key of keys) {
    const day: DayStats | undefined = stats.days[key];
    if (!day) continue;
    summary.listen += day.listen;
    summary.create += day.create;
    summary.plays += day.plays;
    if (day.listen + day.create >= ACTIVE_DAY_SECONDS) summary.activeDays++;
    addAll(summary.songs, day.songs);
    addAll(summary.sources, day.sources);
    const row = summary.week[(keyDate(key).getDay() + 6) % 7];
    for (const [hour, seconds] of Object.entries(day.hours)) {
      if (row) row[Number(hour)] = (row[Number(hour)] ?? 0) + seconds;
    }
  }
  return summary;
}

/** Relative change from `previous` to `current`, or `null` when there is nothing to compare with. */
export const change = (current: number, previous: number): number | null => (previous > 0 ? (current - previous) / previous : null);

const isActive = (stats: Stats, key: string) => {
  const day = stats.days[key];
  return day !== undefined && day.listen + day.create >= ACTIVE_DAY_SECONDS;
};

/**
 * Days in a row with some activity. The current streak is still alive when today is empty so far
 * (it counts up to yesterday).
 */
export function streaks(stats: Stats, today: Date): { current: number; best: number } {
  const keys = dayKeys(today, 400);
  let best = 0;
  let run = 0;
  for (const key of keys) {
    run = isActive(stats, key) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  let current = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i];
    if (key !== undefined && isActive(stats, key)) current++;
    else if (i !== keys.length - 1) break;
  }
  return { current, best };
}

export interface Ranked {
  key: string;
  value: number;
}

/** Entries with a value, biggest first (ties by key, so the order is stable). */
export const ranked = (record: Record<string, number>): Ranked[] =>
  Object.entries(record)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));

export type DayPart = "morning" | "afternoon" | "evening" | "night";

/** When most of the listening happens, from a `RangeSummary.week`. `null` with no listening. */
export function peakDayPart(week: readonly (readonly number[])[]): DayPart | null {
  const parts: Record<DayPart, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const row of week) {
    row.forEach((seconds, hour) => {
      const part: DayPart = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : hour >= 18 && hour < 23 ? "evening" : "night";
      parts[part] += seconds;
    });
  }
  const best = ranked(parts)[0];
  return best ? (best.key as DayPart) : null;
}

// --- The sound people listen to ----------------------------------------------------------------

export const SOUND_TRAITS = ["swing", "looseness", "warmth", "wobble", "space", "muffle"] as const;
export type SoundTrait = (typeof SOUND_TRAITS)[number];

export interface SoundProfile {
  /** Average tempo, weighted by listening time. */
  bpm: number;
  /** Each 0..1, weighted by listening time. */
  traits: Record<SoundTrait, number>;
  /** Share of listening (0..1) per voice, for each instrument; `"off"` for a silent pad or melody. */
  voices: Record<ProfileInstrument, Record<string, number>>;
  /** Average ambience levels, 0..1. */
  ambience: AmbienceParams;
  /** Listening per 5-BPM band, keyed by the band's lowest tempo. */
  tempos: Record<string, number>;
}

const traitsOf = (p: SongParams): Record<SoundTrait, number> => ({
  swing: p.swing,
  looseness: p.humanize,
  warmth: p.fx.warmth,
  wobble: p.fx.wobble,
  space: p.fx.reverb,
  // A darker master filter is a more "muffled" lo-fi tone.
  muffle: 1 - (p.fx.tone - RANGES.tone.min) / (RANGES.tone.max - RANGES.tone.min),
});

export const TEMPO_BAND = 5;

export const PROFILE_INSTRUMENTS = ["keys", "bass", "drums", "pad", "lead"] as const;
export type ProfileInstrument = (typeof PROFILE_INSTRUMENTS)[number];

/** The voice of each instrument in a song (the kit for the drums), `"off"` for a silent pad or melody. */
const voicesOf = (p: SongParams): Record<ProfileInstrument, string> => ({
  keys: p.keys.voice,
  bass: p.bass.voice,
  drums: p.drums.kit,
  pad: p.pad.level > 0 ? p.pad.voice : "off",
  lead: p.lead.level > 0 ? p.lead.voice : "off",
});

/** The average sound of what was heard, each song weighted by its listening time. `null` with none. */
export function soundProfile(heard: readonly { params: SongParams; seconds: number }[]): SoundProfile | null {
  const total = heard.reduce((sum, item) => sum + Math.max(0, item.seconds), 0);
  if (total <= 0) return null;
  const traits = Object.fromEntries(SOUND_TRAITS.map((trait) => [trait, 0])) as Record<SoundTrait, number>;
  const profile: SoundProfile = {
    bpm: 0,
    traits,
    voices: { keys: {}, bass: {}, drums: {}, pad: {}, lead: {} },
    ambience: { ...SILENT_AMBIENCE },
    tempos: {},
  };
  for (const { params, seconds } of heard) {
    if (seconds <= 0) continue;
    const weight = seconds / total;
    profile.bpm += params.bpm * weight;
    const own = traitsOf(params);
    for (const trait of SOUND_TRAITS) traits[trait] += own[trait] * weight;
    const voices = voicesOf(params);
    for (const instrument of PROFILE_INSTRUMENTS) {
      const shares = profile.voices[instrument];
      shares[voices[instrument]] = (shares[voices[instrument]] ?? 0) + weight;
    }
    for (const id of AMBIENCE_LAYERS) profile.ambience[id] += params.ambience[id] * weight;
    const band = String(Math.floor(params.bpm / TEMPO_BAND) * TEMPO_BAND);
    profile.tempos[band] = (profile.tempos[band] ?? 0) + seconds;
  }
  return profile;
}
