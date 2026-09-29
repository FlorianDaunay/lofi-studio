import { create } from "zustand";
import { emptyStats, type Stats } from "@/songs/stats";

interface StatsState {
  stats: Stats;
  /** Applies a pure change from `songs/stats.ts` (e.g. `(s) => countPlay(s, now, id)`). */
  record: (change: (stats: Stats) => Stats) => void;
  hydrate: (stats: Stats) => void;
}

/** How the app is used (listening, creating), shown on the Stats page. Filled by `startActivityTracking`. */
export const useStats = create<StatsState>()((set) => ({
  stats: emptyStats(Date.now()),
  record: (change) => set((s) => ({ stats: change(s.stats) })),
  hydrate: (stats) => set({ stats }),
}));
