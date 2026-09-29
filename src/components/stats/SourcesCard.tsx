import { Library, ListMusic } from "lucide-react";
import { formatSpent } from "@/lib/format";
import { ranked } from "@/songs/insights";
import { LIBRARY_SOURCE } from "@/songs/stats";
import { findPlaylist, useLibrary } from "@/state/library";
import { RankedList, type RankedItem } from "./RankedList";
import { StatCard } from "./StatCard";
import type { StatsView } from "./stats-view";

const iconTile = "flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-accent/10 text-accent";

/** Where the music played from: the whole library or a playlist. */
export function SourcesCard({ view }: { view: StatsView }) {
  const playlists = useLibrary((s) => s.playlists);
  const items: RankedItem[] = ranked(view.current.sources).flatMap(({ key, value }) => {
    const library = key === LIBRARY_SOURCE;
    const name = library ? "Whole library" : findPlaylist(playlists, key)?.name;
    if (!name) return [];
    const share = view.current.listen > 0 ? Math.round((value / view.current.listen) * 100) : 0;
    const Icon = library ? Library : ListMusic;
    return [
      {
        key,
        label: name,
        detail: `${share} % of your listening`,
        value,
        leading: (
          <span className={iconTile} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
        ),
      },
    ];
  });

  return (
    <StatCard title="Played from" subtitle={items.length > 0 ? "The library or the playlist the player followed." : "Nothing played in this period yet."}>
      <RankedList items={items} format={formatSpent} />
    </StatCard>
  );
}
