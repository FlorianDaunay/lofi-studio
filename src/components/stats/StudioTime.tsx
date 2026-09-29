import { useState } from "react";
import { SongCover } from "@/components/library/SongCover";
import { UI_LOCALE, formatSpent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ranked } from "@/songs/insights";
import { useLibrary } from "@/state/library";
import { RankedList, type RankedItem } from "./RankedList";
import { StatCard } from "./StatCard";
import type { StatsView } from "./stats-view";

const MONTHS = 6;
const monthFormat = new Intl.DateTimeFormat(UI_LOCALE, { month: "short" });
const longMonthFormat = new Intl.DateTimeFormat(UI_LOCALE, { month: "long", year: "numeric" });

/** Songs saved per month, for the last `MONTHS` months (oldest first). */
function useSongsByMonth() {
  const songs = useLibrary((s) => s.songs);
  const now = new Date();
  return Array.from({ length: MONTHS }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const count = songs.filter((song) => song.createdAt >= start.getTime() && song.createdAt < end.getTime()).length;
    return { start, count };
  });
}

/** Columns of songs made per month. */
function MonthColumns() {
  const months = useSongsByMonth();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <div>
      <p className="mb-2 text-xs text-text-muted">
        Songs saved per month{months.every((m) => m.count === 0) && ": none lately, save a sound from the Studio to start"}
      </p>
      <div className="flex h-20 items-end gap-2">
        {months.map(({ start, count }, i) => (
          <div
            key={start.getTime()}
            tabIndex={0}
            role="img"
            aria-label={`${longMonthFormat.format(start)}: ${count} song${count === 1 ? "" : "s"}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="relative flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            {count > 0 && <span className="text-[10px] tabular-nums text-text-muted">{count}</span>}
            <div
              className={cn("w-full max-w-6 rounded-t-tile", count > 0 ? "bg-accent" : "bg-surface-hover", hover === i && count > 0 && "bg-accent-hover")}
              style={{ height: count > 0 ? `${(count / max) * 70}%` : "3px" }}
            />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-control border bg-surface px-2 py-1 text-xs shadow-overlay">
                <div className="font-semibold">
                  {count} song{count === 1 ? "" : "s"}
                </div>
                <div className="text-text-muted">{longMonthFormat.format(start)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 text-[10px] text-text-muted" aria-hidden>
        {months.map(({ start }) => (
          <span key={start.getTime()} className="flex-1 text-center">
            {monthFormat.format(start)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Time in the studio: how much, on which songs, and how many songs came out of it. */
export function StudioTime({ view }: { view: StatsView }) {
  const userSongs = useLibrary((s) => s.songs.length);
  const worked: RankedItem[] = ranked(Object.fromEntries(Object.entries(view.stats.songs).map(([id, s]) => [id, s.create])))
    .slice(0, 5)
    .flatMap(({ key, value }) => {
      const song = view.song(key);
      return song ? [{ key, label: song.name, value, leading: <SongCover params={song.params} className="w-8 shrink-0" /> }] : [];
    });

  return (
    <StatCard
      title="In the studio"
      subtitle={`${formatSpent(view.stats.total.create)} spent shaping sounds, ${userSongs} song${userSongs === 1 ? "" : "s"} of your own.`}
    >
      <MonthColumns />
      <div>
        <p className="mb-1 text-xs text-text-muted">Most worked on</p>
        {worked.length > 0 ? (
          <RankedList items={worked} format={formatSpent} />
        ) : (
          <p className="text-sm text-text-muted">Edit a song in the Studio and save it: the time you spent shows here.</p>
        )}
      </div>
    </StatCard>
  );
}
