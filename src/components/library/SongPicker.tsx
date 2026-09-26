import { Search } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PINNED_SLOTS, type Song } from "@/songs/types";
import { useLibrary } from "@/state/library";
import { useAllSongs } from "@/state/selectors";
import { songChords, songIcon } from "./song-display";

interface SongPickerProps {
  /** The pinned slot (0-based) being changed, or `null` when closed. */
  slot: number | null;
  onClose: () => void;
}

function SongList({ slot, onClose }: { slot: number; onClose: () => void }) {
  const songs = useAllSongs();
  const pinned = useLibrary((s) => s.pinned);
  const pinSong = useLibrary((s) => s.pinSong);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = songs.filter((song) => !needle || song.name.toLowerCase().includes(needle));

  const choose = (song: Song) => {
    pinSong(slot, song.id);
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative border-b px-5 py-3">
        <Search className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs…" aria-label="Search songs" className="pl-9" />
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {shown.length === 0 && <li className="py-8 text-center text-sm text-text-muted">No song matches.</li>}
        {shown.map((song) => {
          const Icon = songIcon(song);
          const current = pinned[slot] === song.id;
          const elsewhere = !current && pinned.includes(song.id);
          return (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => choose(song)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors hover:bg-surface-hover",
                  current && "bg-accent/10",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tile bg-surface-hover text-accent" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{song.name}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {song.params.bpm} BPM · {songChords(song)}
                  </span>
                </span>
                {current && <span className="text-xs text-accent">In this slot</span>}
                {elsewhere && <span className="text-xs text-text-muted">Swaps with slot {pinned.indexOf(song.id) + 1}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Choose which song goes in a pinned slot of the Studio page. */
export function SongPicker({ slot, onClose }: SongPickerProps) {
  return (
    <Dialog
      open={slot !== null}
      onOpenChange={(open) => !open && onClose()}
      title={slot === null ? "Pinned song" : `Song for slot ${slot + 1} of ${PINNED_SLOTS}`}
      description="Pinned songs are one click away on the Studio page."
      className="h-[32rem] w-[min(92vw,32rem)]"
    >
      {slot !== null && <SongList slot={slot} onClose={onClose} />}
    </Dialog>
  );
}
