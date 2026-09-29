import { Play, SlidersHorizontal } from "lucide-react";
import { SongCover } from "@/components/library/SongCover";
import { Button } from "@/components/ui/button";
import { UI_LOCALE, formatSpent } from "@/lib/format";
import type { Song } from "@/songs/types";
import { useNavigation } from "@/state/navigation";
import { playSource } from "@/state/playback";
import { useStudio } from "@/state/studio";
import { Sparkline } from "./Sparkline";
import { StatCard } from "./StatCard";
import type { StatsView } from "./stats-view";

const relative = new Intl.RelativeTimeFormat(UI_LOCALE, { numeric: "auto" });

function lastPlayed(at: number): string {
  if (at <= 0) return "Never";
  const minutes = (at - Date.now()) / 60_000;
  if (minutes > -60) return relative.format(Math.round(minutes), "minute");
  if (minutes > -60 * 24) return relative.format(Math.round(minutes / 60), "hour");
  return relative.format(Math.round(minutes / 60 / 24), "day");
}

/** How often a song is heard to its end: a ring, full when it is never skipped. */
function CompletionRing({ finished, skipped }: { finished: number; skipped: number }) {
  const ended = finished + skipped;
  const share = ended > 0 ? finished / ended : 0;
  const radius = 26;
  const length = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden>
        <circle cx={32} cy={32} r={radius} fill="none" strokeWidth={6} className="stroke-surface-hover" />
        {ended > 0 && (
          <circle
            cx={32}
            cy={32}
            r={radius}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${share * length} ${length}`}
            className="stroke-accent motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
          />
        )}
      </svg>
      <div>
        <p className="text-lg font-semibold">{ended > 0 ? `${Math.round(share * 100)} %` : "—"}</p>
        <p className="text-xs text-text-muted">
          {ended > 0 ? `heard to the end (${finished} of ${ended})` : "not finished or skipped yet"}
        </p>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-tile bg-surface-hover/60 px-3 py-2">
      <p className="truncate text-xs text-text-muted">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

/** Everything about one song: all-time numbers, how often it is finished, and its trend over the range. */
export function SongSpotlight({ view, song }: { view: StatsView; song: Song }) {
  const loadSong = useStudio((s) => s.loadSong);
  const go = useNavigation((s) => s.go);
  const counts = view.stats.songs[song.id];
  const trend = view.keys.map((key) => view.stats.days[key]?.songs[song.id] ?? 0);

  return (
    <StatCard title="Song spotlight" subtitle="All-time numbers of the song picked in Top songs.">
      <div className="flex items-center gap-4">
        <SongCover params={song.params} className="w-20 shrink-0 shadow-card" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{song.name}</p>
          <p className="line-clamp-2 text-xs text-text-muted">{song.description || (song.builtIn ? "Built-in song" : "Your song")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => void playSource({ kind: "library" }, song.id)}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              Play
            </Button>
            <Button
              size="sm"
              onClick={() => {
                loadSong(song);
                go("studio");
              }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Open in Studio
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Figure label="Listened" value={formatSpent(counts?.listen ?? 0)} />
        <Figure label="Times started" value={String(counts?.plays ?? 0)} />
        <Figure label="In the studio" value={formatSpent(counts?.create ?? 0)} />
        <Figure label="Last played" value={lastPlayed(counts?.lastPlayed ?? 0)} />
      </div>
      <CompletionRing finished={counts?.finished ?? 0} skipped={counts?.skipped ?? 0} />
      {trend.some((v) => v > 0) && (
        <div>
          <p className="mb-1 text-xs text-text-muted">Listening over the period</p>
          <Sparkline values={trend} />
        </div>
      )}
    </StatCard>
  );
}
