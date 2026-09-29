import { useMemo } from "react";
import {
  RANGE_DAYS,
  activitySeries,
  dayKeys,
  soundProfile,
  streaks,
  summarize,
  type DayPoint,
  type RangeSummary,
  type SoundProfile,
  type StatsRange,
} from "@/songs/insights";
import { dayKey, type Stats } from "@/songs/stats";
import type { Song } from "@/songs/types";
import { findSong, useLibrary } from "@/state/library";
import { useStats } from "@/state/stats";

/** Everything the stats page shows for one range, computed once per stats update. */
export interface StatsView {
  stats: Stats;
  range: StatsRange;
  keys: string[];
  current: RangeSummary;
  /** The range just before, for the "vs previous" deltas. */
  previous: RangeSummary;
  /** Daily points (weekly for long spans), from the first tracked day on. */
  series: DayPoint[];
  streak: { current: number; best: number };
  profile: SoundProfile | null;
  /** Songs that still exist, by id. */
  song: (id: string) => Song | undefined;
}

export function useStatsView(range: StatsRange): StatsView {
  const stats = useStats((s) => s.stats);
  const songs = useLibrary((s) => s.songs);
  return useMemo(() => {
    const today = new Date();
    const days = RANGE_DAYS[range];
    const keys = dayKeys(today, days);
    // Nothing was tracked before `since`: charts start there (with a week at least) instead of a long flat line.
    const first = keys.findIndex((key) => key >= dayKey(new Date(stats.since)));
    const charted = keys.slice(Math.max(0, Math.min(keys.length - 7, first)));
    const current = summarize(stats, keys);
    const song = (id: string) => findSong(songs, id);
    const heard = Object.entries(current.songs).flatMap(([id, seconds]) => {
      const found = song(id);
      return found ? [{ params: found.params, seconds }] : [];
    });
    return {
      stats,
      range,
      keys,
      current,
      previous: summarize(stats, dayKeys(today, days, days)),
      series: activitySeries(stats, charted, charted.length > 120 ? 7 : 1),
      streak: streaks(stats, today),
      profile: soundProfile(heard),
      song,
    };
  }, [stats, songs, range]);
}
