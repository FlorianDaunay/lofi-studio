import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { SongPicker } from "@/components/library/SongPicker";
import { songIcon } from "@/components/library/song-display";
import { cn } from "@/lib/utils";
import { findSong, useLibrary } from "@/state/library";
import { useStudio } from "@/state/studio";

/** The four pinned songs: one click loads a whole mood (tempo, chords, groove, sound, ambience). */
export function PinnedSongs() {
  const pinned = useLibrary((s) => s.pinned);
  const userSongs = useLibrary((s) => s.songs);
  const songId = useStudio((s) => s.songId);
  const loadSong = useStudio((s) => s.loadSong);
  const [changing, setChanging] = useState<number | null>(null);

  return (
    <section aria-label="Pinned songs">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Pinned songs</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {pinned.map((id, slot) => {
          const song = findSong(userSongs, id);
          if (!song) return null;
          const Icon = songIcon(song);
          const selected = song.id === songId;
          return (
            <li key={slot} className="relative">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => loadSong(song)}
                className={cn(
                  "surface flex h-full w-full flex-col items-start gap-2 p-4 text-left transition-colors hover:bg-surface-hover",
                  selected && "border-accent bg-accent/10",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-tile",
                    selected ? "bg-accent text-accent-foreground" : "bg-surface-hover text-accent",
                  )}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 max-w-full">
                  <span className="block truncate text-sm font-medium">{song.name}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {song.params.bpm} BPM · {song.description || "No description"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChanging(slot)}
                aria-label={`Change the song in slot ${slot + 1}`}
                title="Change this slot"
                className="absolute right-2 top-2 rounded-control p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <SongPicker slot={changing} onClose={() => setChanging(null)} />
    </section>
  );
}
