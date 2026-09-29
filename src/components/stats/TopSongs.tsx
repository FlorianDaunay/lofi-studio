import { useState } from "react";
import { SongCover } from "@/components/library/SongCover";
import { Button } from "@/components/ui/button";
import { formatSpent } from "@/lib/format";
import { ranked } from "@/songs/insights";
import { RankedList, type RankedItem } from "./RankedList";
import { StatCard } from "./StatCard";
import type { StatsView } from "./stats-view";

const SHOWN = 6;

interface TopSongsProps {
  view: StatsView;
  selected: string | null;
  onSelect: (id: string) => void;
}

/** The songs listened to most over the range; picking one shows its details. */
export function TopSongs({ view, selected, onSelect }: TopSongsProps) {
  const [all, setAll] = useState(false);
  const items: RankedItem[] = ranked(view.current.songs).flatMap(({ key, value }) => {
    const song = view.song(key);
    if (!song) return [];
    const share = view.current.listen > 0 ? Math.round((value / view.current.listen) * 100) : 0;
    return [
      {
        key,
        label: song.name,
        detail: `${share} % of your listening`,
        value,
        leading: <SongCover params={song.params} className="w-10 shrink-0" />,
      },
    ];
  });

  return (
    <StatCard
      title="Top songs"
      subtitle={items.length > 0 ? `${items.length} different song${items.length > 1 ? "s" : ""} heard. Pick one for its details.` : "No songs heard in this period yet."}
    >
      <RankedList items={all ? items : items.slice(0, SHOWN)} format={formatSpent} selected={selected} onSelect={onSelect} />
      {items.length > SHOWN && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </Button>
      )}
    </StatCard>
  );
}
