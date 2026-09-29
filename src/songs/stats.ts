import { isRecord } from "./sanitize";

/**
 * What the app remembers of how it is used: time spent listening and creating, per day, per
 * song and per source. Only totals are kept (no event log), so the file stays small whatever
 * the usage. Everything is in seconds; days are local calendar days (`YYYY-MM-DD`).
 */

/** Where the music played from: `"library"` or a playlist id. */
export type SourceKey = string;
export const LIBRARY_SOURCE: SourceKey = "library";

export interface DayStats {
  listen: number;
  create: number;
  /** Songs started that day. */
  plays: number;
  /** Listening per song id. */
  songs: Record<string, number>;
  /** Listening per source. */
  sources: Record<SourceKey, number>;
  /** Listening per hour of the day (`"0"` to `"23"`), for "when do you listen". */
  hours: Record<string, number>;
}

/** All-time counters of one song. */
export interface SongStats {
  listen: number;
  /** Time spent editing it in the studio (including before it was first saved). */
  create: number;
  plays: number;
  /** Played to its end and moved on by itself. */
  finished: number;
  /** Left with "next" before its end. */
  skipped: number;
  /** Epoch ms. */
  lastPlayed: number;
}

export interface Stats {
  /** Epoch ms of the first time the app tracked anything. */
  since: number;
  total: { listen: number; create: number; plays: number };
  /** Longest stretch of uninterrupted listening. */
  longestSession: number;
  songs: Record<string, SongStats>;
  days: Record<string, DayStats>;
}

/** A year of days is enough for every chart, and keeps `config.json` far below its cap. */
export const MAX_STAT_DAYS = 366;

export const emptyStats = (now: number): Stats => ({
  since: now,
  total: { listen: 0, create: 0, plays: 0 },
  longestSession: 0,
  songs: {},
  days: {},
});

const emptyDay = (): DayStats => ({ listen: 0, create: 0, plays: 0, songs: {}, sources: {}, hours: {} });
const emptySong = (): SongStats => ({ listen: 0, create: 0, plays: 0, finished: 0, skipped: 0, lastPlayed: 0 });

/** The local calendar day of `date`, as used for keys. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const add = (record: Record<string, number>, key: string, amount: number) => ({ ...record, [key]: (record[key] ?? 0) + amount });

function updateDay(stats: Stats, at: Date, change: (day: DayStats) => DayStats): Stats["days"] {
  const key = dayKey(at);
  return { ...stats.days, [key]: change(stats.days[key] ?? emptyDay()) };
}

function updateSong(stats: Stats, id: string, change: (song: SongStats) => SongStats): Stats["songs"] {
  return { ...stats.songs, [id]: change(stats.songs[id] ?? emptySong()) };
}

/** `seconds` of music heard, ending at `at`. `songId` is `null` for a sound that is not a saved song. */
export function addListening(stats: Stats, at: Date, seconds: number, songId: string | null, source: SourceKey): Stats {
  if (seconds <= 0) return stats;
  return {
    ...stats,
    total: { ...stats.total, listen: stats.total.listen + seconds },
    days: updateDay(stats, at, (day) => ({
      ...day,
      listen: day.listen + seconds,
      songs: songId === null ? day.songs : add(day.songs, songId, seconds),
      sources: add(day.sources, source, seconds),
      hours: add(day.hours, String(at.getHours()), seconds),
    })),
    songs: songId === null ? stats.songs : updateSong(stats, songId, (song) => ({ ...song, listen: song.listen + seconds })),
  };
}

/** `seconds` of work in the studio, counted for the day (the song may not exist yet: see `addSongCreating`). */
export function addCreating(stats: Stats, at: Date, seconds: number): Stats {
  if (seconds <= 0) return stats;
  return {
    ...stats,
    total: { ...stats.total, create: stats.total.create + seconds },
    days: updateDay(stats, at, (day) => ({ ...day, create: day.create + seconds })),
  };
}

/** Credits studio time (already counted by `addCreating`) to the song it ended up in. */
export function addSongCreating(stats: Stats, songId: string, seconds: number): Stats {
  if (seconds <= 0) return stats;
  return { ...stats, songs: updateSong(stats, songId, (song) => ({ ...song, create: song.create + seconds })) };
}

export function countPlay(stats: Stats, at: Date, songId: string | null): Stats {
  return {
    ...stats,
    total: { ...stats.total, plays: stats.total.plays + 1 },
    days: updateDay(stats, at, (day) => ({ ...day, plays: day.plays + 1 })),
    songs:
      songId === null ? stats.songs : updateSong(stats, songId, (song) => ({ ...song, plays: song.plays + 1, lastPlayed: at.getTime() })),
  };
}

/** A song stopped being the one playing: it ran to its end (`finished`) or was skipped. */
export function countSongEnd(stats: Stats, songId: string, finished: boolean): Stats {
  return {
    ...stats,
    songs: updateSong(stats, songId, (song) =>
      finished ? { ...song, finished: song.finished + 1 } : { ...song, skipped: song.skipped + 1 },
    ),
  };
}

export function recordSession(stats: Stats, seconds: number): Stats {
  return seconds > stats.longestSession ? { ...stats, longestSession: seconds } : stats;
}

// --- Reading back untrusted JSON -------------------------------------------------------------

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** More than a day's worth of seconds in one day, or a counter beyond this, is nonsense. */
const MAX_SECONDS = 1e9;

const amount = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(MAX_SECONDS, Math.max(0, v)) : 0);
/** An epoch ms in the past, or `0`. */
const timestamp = (v: unknown, now: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= now ? v : 0);

function amounts(raw: unknown, keep: (key: string) => boolean): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const seconds = amount(value);
    if (seconds > 0 && keep(key)) out[key] = seconds;
  }
  return out;
}

const isHour = (key: string) => /^\d{1,2}$/.test(key) && Number(key) < 24;

/**
 * Rebuilds stats from the config file. Songs and playlists that no longer exist are dropped (a
 * deleted song leaves nothing behind), and only the latest `MAX_STAT_DAYS` days are kept.
 */
export function sanitizeStats(raw: unknown, songIds: readonly string[], playlistIds: readonly string[], now: number): Stats {
  const r = isRecord(raw) ? raw : {};
  const songSet = new Set(songIds);
  const sourceSet = new Set([LIBRARY_SOURCE, ...playlistIds]);
  const total = isRecord(r.total) ? r.total : {};

  const songs: Stats["songs"] = {};
  if (isRecord(r.songs)) {
    for (const [id, value] of Object.entries(r.songs)) {
      if (!songSet.has(id) || !isRecord(value)) continue;
      songs[id] = {
        listen: amount(value.listen),
        create: amount(value.create),
        plays: Math.round(amount(value.plays)),
        finished: Math.round(amount(value.finished)),
        skipped: Math.round(amount(value.skipped)),
        lastPlayed: timestamp(value.lastPlayed, now),
      };
    }
  }

  const days: Stats["days"] = {};
  const dayKeys = isRecord(r.days) ? Object.keys(r.days).filter((key) => DAY_KEY.test(key)) : [];
  for (const key of dayKeys.sort().slice(-MAX_STAT_DAYS)) {
    const value = isRecord(r.days) && isRecord(r.days[key]) ? r.days[key] : {};
    days[key] = {
      listen: amount(value.listen),
      create: amount(value.create),
      plays: Math.round(amount(value.plays)),
      songs: amounts(value.songs, (id) => songSet.has(id)),
      sources: amounts(value.sources, (id) => sourceSet.has(id)),
      hours: amounts(value.hours, isHour),
    };
  }

  return {
    since: timestamp(r.since, now) || now,
    total: { listen: amount(total.listen), create: amount(total.create), plays: Math.round(amount(total.plays)) },
    longestSession: amount(r.longestSession),
    songs,
    days,
  };
}
