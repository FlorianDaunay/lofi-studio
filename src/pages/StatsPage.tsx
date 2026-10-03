import { Flame, Headphones, Play, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityChart } from "@/components/stats/ActivityChart";
import { ListeningClock } from "@/components/stats/ListeningClock";
import { MadeForYou } from "@/components/stats/MadeForYou";
import { SongSpotlight } from "@/components/stats/SongSpotlight";
import { SoundProfile } from "@/components/stats/SoundProfile";
import { SourcesCard } from "@/components/stats/SourcesCard";
import { StatTile } from "@/components/stats/StatTile";
import { StudioTime } from "@/components/stats/StudioTime";
import { TopSongs } from "@/components/stats/TopSongs";
import { useStatsView } from "@/components/stats/stats-view";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { UI_LOCALE, formatSpent } from "@/lib/format";
import { change, ranked, type StatsRange } from "@/songs/insights";
import { useNavigation } from "@/state/navigation";

const RANGE_OPTIONS: readonly { value: StatsRange; label: string }[] = [
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "quarter", label: "90 days" },
  { value: "year", label: "12 months" },
];

const sinceFormat = new Intl.DateTimeFormat(UI_LOCALE, { month: "long", day: "numeric", year: "numeric" });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function EmptyState() {
  const go = useNavigation((s) => s.go);
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-tile bg-accent/10 text-accent" aria-hidden>
        <Headphones className="h-6 w-6" />
      </span>
      <h2 className="text-base font-semibold">Nothing to show yet</h2>
      <p className="max-w-sm text-sm text-text-muted">
        Play some music or shape a sound in the Studio: your listening time, favorite songs and habits fill this page as you go.
      </p>
      <Button variant="primary" onClick={() => go("studio")}>
        Go to the Studio
      </Button>
    </div>
  );
}

/** A dashboard of how the app is used: listening, creating, favorite songs and sounds, and when. */
export function StatsPage() {
  const [range, setRange] = useState<StatsRange>("month");
  const view = useStatsView(range);
  const [picked, setPicked] = useState<string | null>(null);
  const { current, previous, series, streak, stats } = view;

  // The spotlight follows the pick, or the top song of the period.
  const spotlightId = (picked && view.song(picked) ? picked : undefined) ?? ranked(current.songs).find((item) => view.song(item.key))?.key;
  const spotlight = spotlightId ? view.song(spotlightId) : undefined;
  const empty = stats.total.listen + stats.total.create < 1;

  return (
    <>
      <PageHeader
        title="Your stats"
        description={empty ? "How you listen and create, as you use the app." : `Since ${sinceFormat.format(stats.since)}: ${formatSpent(stats.total.listen)} of music heard.`}
        actions={!empty && <Segmented label="Period" compact value={range} options={RANGE_OPTIONS} onChange={setRange} />}
      />
      {empty ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Listening"
              icon={Headphones}
              value={formatSpent(current.listen)}
              delta={change(current.listen, previous.listen)}
              note={plural(current.activeDays, "active day")}
              trend={series.map((p) => p.listen)}
            />
            <StatTile
              label="Creating"
              icon={SlidersHorizontal}
              value={formatSpent(current.create)}
              delta={change(current.create, previous.create)}
              note="in the Studio"
              trend={series.map((p) => p.create)}
            />
            <StatTile
              label="Songs started"
              icon={Play}
              value={String(current.plays)}
              delta={change(current.plays, previous.plays)}
              note={plural(Object.keys(current.songs).length, "different song")}
              trend={series.map((p) => p.plays)}
            />
            <StatTile
              label="Streak"
              icon={Flame}
              value={plural(streak.current, "day")}
              note={`Best: ${plural(streak.best, "day")} · longest session ${formatSpent(stats.longestSession)}`}
            />
          </div>

          <ActivityChart series={series} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TopSongs view={view} selected={spotlightId ?? null} onSelect={setPicked} />
            {spotlight ? <SongSpotlight view={view} song={spotlight} /> : <SourcesCard view={view} />}
          </div>

          <ListeningClock week={current.week} />
          <SoundProfile profile={view.profile} />
          {view.profile && <MadeForYou key={range} profile={view.profile} />}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {spotlight && <SourcesCard view={view} />}
            <StudioTime view={view} />
          </div>
        </>
      )}
    </>
  );
}
