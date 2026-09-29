import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "./builtin";
import { activitySeries, change, dayKeys, peakDayPart, ranked, soundProfile, streaks, summarize } from "./insights";
import {
  LIBRARY_SOURCE,
  MAX_STAT_DAYS,
  addCreating,
  addListening,
  addSongCreating,
  countPlay,
  countSongEnd,
  dayKey,
  emptyStats,
  recordSession,
  sanitizeStats,
  type Stats,
} from "./stats";

// A Wednesday, at 21:30 local time.
const NOW = new Date(2026, 8, 30, 21, 30);
const at = (daysAgo: number, hour = 21) => new Date(2026, 8, 30 - daysAgo, hour, 0);
const SONG = BUILT_IN_SONGS[0]!;
const OTHER = BUILT_IN_SONGS[1]!;

describe("recording stats", () => {
  it("credits listening to the day, hour, song and source", () => {
    let stats = addListening(emptyStats(0), NOW, 30, SONG.id, "list-1");
    stats = addListening(stats, NOW, 15, null, LIBRARY_SOURCE);
    const day = stats.days[dayKey(NOW)]!;
    expect(stats.total.listen).toBe(45);
    expect(day.listen).toBe(45);
    expect(day.hours["21"]).toBe(45);
    expect(day.songs).toEqual({ [SONG.id]: 30 });
    expect(day.sources).toEqual({ "list-1": 30, [LIBRARY_SOURCE]: 15 });
    expect(stats.songs[SONG.id]!.listen).toBe(30);
  });

  it("counts plays, ends and studio time", () => {
    let stats = countPlay(emptyStats(0), NOW, SONG.id);
    stats = countSongEnd(stats, SONG.id, true);
    stats = countSongEnd(stats, SONG.id, false);
    stats = addCreating(stats, NOW, 120);
    stats = addSongCreating(stats, SONG.id, 120);
    expect(stats.songs[SONG.id]).toMatchObject({ plays: 1, finished: 1, skipped: 1, create: 120, lastPlayed: NOW.getTime() });
    expect(stats.total).toEqual({ listen: 0, create: 120, plays: 1 });
    expect(stats.days[dayKey(NOW)]!.create).toBe(120);
  });

  it("keeps the longest session", () => {
    expect(recordSession(recordSession(emptyStats(0), 600), 300).longestSession).toBe(600);
  });

  it("never changes anything for nothing", () => {
    const stats = emptyStats(0);
    expect(addListening(stats, NOW, 0, SONG.id, LIBRARY_SOURCE)).toBe(stats);
    expect(addCreating(stats, NOW, -5)).toBe(stats);
  });
});

describe("sanitizeStats", () => {
  it("round-trips valid stats", () => {
    let stats = addListening(emptyStats(1000), NOW, 30, SONG.id, LIBRARY_SOURCE);
    stats = countPlay(stats, NOW, SONG.id);
    expect(sanitizeStats(JSON.parse(JSON.stringify(stats)), [SONG.id], [], NOW.getTime())).toEqual(stats);
  });

  it("drops deleted songs and playlists, junk and old days", () => {
    const days: Record<string, unknown> = { nope: { listen: 5 } };
    for (let i = 0; i < MAX_STAT_DAYS + 10; i++) days[dayKey(at(i))] = { listen: 60, hours: { "3": 60, "99": 5 } };
    days[dayKey(NOW)] = { listen: -4, songs: { gone: 10, [SONG.id]: 20 }, sources: { gone: 5, [LIBRARY_SOURCE]: "x" } };
    const stats = sanitizeStats(
      { since: 9e15, total: { listen: Infinity }, songs: { gone: { listen: 5 }, [SONG.id]: { plays: 2.4 } }, days },
      [SONG.id],
      [],
      NOW.getTime(),
    );
    expect(Object.keys(stats.days)).toHaveLength(MAX_STAT_DAYS);
    expect(stats.days[dayKey(at(MAX_STAT_DAYS + 5))]).toBeUndefined();
    expect(stats.days[dayKey(at(1))]!.hours).toEqual({ "3": 60 });
    expect(stats.days[dayKey(NOW)]).toMatchObject({ listen: 0, songs: { [SONG.id]: 20 }, sources: {} });
    expect(Object.keys(stats.songs)).toEqual([SONG.id]);
    expect(stats.songs[SONG.id]!.plays).toBe(2);
    expect(stats.since).toBe(NOW.getTime());
    expect(stats.total.listen).toBe(0);
  });

  it("survives anything", () => {
    for (const raw of [null, 3, "x", [], { days: [], songs: 4 }]) expect(sanitizeStats(raw, [], [], 5).since).toBe(5);
  });
});

describe("insights", () => {
  const sample = (): Stats => {
    let stats = emptyStats(0);
    // Active today, yesterday and the day before; then a gap; then 4 days in a row.
    for (const daysAgo of [0, 1, 2, 5, 6, 7, 8]) stats = addListening(stats, at(daysAgo), 600, SONG.id, LIBRARY_SOURCE);
    stats = addListening(stats, at(1, 8), 300, OTHER.id, "list-1");
    stats = addCreating(stats, at(3), 30); // too little to count as an active day
    return stats;
  };

  it("lists day keys oldest first", () => {
    expect(dayKeys(NOW, 3)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30"]);
    expect(dayKeys(NOW, 2, 7)).toEqual(["2026-09-22", "2026-09-23"]);
  });

  it("sums a range, per song, source and weekday hour", () => {
    const summary = summarize(sample(), dayKeys(NOW, 7));
    expect(summary.listen).toBe(5 * 600 + 300);
    expect(summary.create).toBe(30);
    expect(summary.activeDays).toBe(5);
    expect(ranked(summary.songs)).toEqual([
      { key: SONG.id, value: 3000 },
      { key: OTHER.id, value: 300 },
    ]);
    expect(summary.sources).toEqual({ [LIBRARY_SOURCE]: 3000, "list-1": 300 });
    // NOW is a Wednesday: weekday 2 when Monday is 0.
    expect(summary.week[2]![21]).toBe(600);
    expect(summary.week[1]![8]).toBe(300);
    expect(peakDayPart(summary.week)).toBe("evening");
  });

  it("groups long ranges into weeks", () => {
    const points = activitySeries(sample(), dayKeys(NOW, 14), 7);
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.days)).toEqual([7, 7]);
    expect(points[0]!.listen + points[1]!.listen).toBe(7 * 600 + 300);
  });

  it("counts streaks, alive until the end of today", () => {
    expect(streaks(sample(), NOW)).toEqual({ current: 3, best: 4 });
    // Nothing yet today: yesterday's streak still counts.
    const tomorrow = new Date(2026, 9, 1, 9);
    expect(streaks(sample(), tomorrow).current).toBe(3);
    expect(streaks(emptyStats(0), NOW)).toEqual({ current: 0, best: 0 });
  });

  it("compares periods", () => {
    expect(change(150, 100)).toBeCloseTo(0.5);
    expect(change(10, 0)).toBeNull();
  });

  it("weights the sound profile by listening time", () => {
    expect(soundProfile([])).toBeNull();
    const profile = soundProfile([
      { params: SONG.params, seconds: 300 },
      { params: OTHER.params, seconds: 100 },
    ])!;
    expect(profile.bpm).toBeCloseTo(SONG.params.bpm * 0.75 + OTHER.params.bpm * 0.25);
    expect(profile.traits.swing).toBeCloseTo(SONG.params.swing * 0.75 + OTHER.params.swing * 0.25);
    const keysShare = Object.values(profile.voices.keys).reduce((a, b) => a + b, 0);
    expect(keysShare).toBeCloseTo(1);
    for (const value of Object.values(profile.traits)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(Object.values(profile.tempos).reduce((a, b) => a + b, 0)).toBe(400);
  });
});
