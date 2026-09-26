import { Download } from "lucide-react";
import { useState } from "react";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { SongCover } from "@/components/library/SongCover";
import { Button } from "@/components/ui/button";
import { findTwin, playlistSongIndexes, sharedPlaylistSongs } from "@/songs/import-plan";
import type { SharedPlaylist } from "@/songs/share";
import type { SongDraft } from "@/songs/types";
import { useLibrary } from "@/state/library";
import { SelectableTile } from "./SelectableTile";

export interface Shared {
  songs: SongDraft[];
  playlists: SharedPlaylist[];
}

interface ImportPreviewProps {
  shared: Shared;
  onImport: (chosen: { songs: ReadonlySet<number>; playlists: ReadonlySet<number> }) => void;
}

const indexes = (n: number) => new Set(Array.from({ length: n }, (_, i) => i));
const toggled = (set: ReadonlySet<number>, i: number) => {
  const next = new Set(set);
  if (!next.delete(i)) next.add(i);
  return next;
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Everything a share contains, as cover tiles, all ticked: untick what you do not want. */
export function ImportPreview({ shared, onImport }: ImportPreviewProps) {
  const library = useLibrary((s) => s.songs);
  const [songs, setSongs] = useState<ReadonlySet<number>>(() => indexes(shared.songs.length));
  const [playlists, setPlaylists] = useState<ReadonlySet<number>>(() => indexes(shared.playlists.length));

  // Songs a ticked playlist needs come along even if their own tile is unticked.
  const pulled = new Set([...playlists].flatMap((i) => (shared.playlists[i] ? playlistSongIndexes(shared.playlists[i]) : [])));
  const total = songs.size + playlists.size;

  return (
    <section aria-label="What is inside" className="surface flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold">Inside this share</h2>
        <p className="text-xs text-text-muted">
          {[shared.songs.length > 0 && plural(shared.songs.length, "song"), shared.playlists.length > 0 && plural(shared.playlists.length, "playlist")]
            .filter(Boolean)
            .join(" and ")}
          . Untick anything you do not want.
        </p>
      </div>

      {shared.playlists.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Playlists">
          {shared.playlists.map((playlist, i) => {
            const members = sharedPlaylistSongs(playlist, shared.songs);
            return (
              <SelectableTile
                key={`p${i}`}
                selected={playlists.has(i)}
                onToggle={() => setPlaylists((prev) => toggled(prev, i))}
                cover={<PlaylistCover songs={members} className="w-full" />}
                title={playlist.name}
                meta={`Playlist · ${plural(members.length, "song")}`}
              />
            );
          })}
        </ul>
      )}

      {shared.songs.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-4" aria-label="Songs">
          {shared.songs.map((song, i) => {
            const twin = findTwin(song, library);
            return (
              <SelectableTile
                key={`s${i}`}
                selected={songs.has(i) || pulled.has(i)}
                onToggle={() => setSongs((prev) => toggled(prev, i))}
                cover={<SongCover params={song.params} className="w-full" />}
                title={song.name}
                meta={`${song.params.bpm} BPM`}
                badge={twin ? "Already in your library" : pulled.has(i) && !songs.has(i) ? "Comes with a playlist" : undefined}
              />
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button variant="primary" disabled={total === 0} onClick={() => onImport({ songs, playlists })}>
          <Download className="h-4 w-4" aria-hidden />
          {total === 0
            ? "Nothing selected"
            : `Add ${[songs.size > 0 && plural(songs.size, "song"), playlists.size > 0 && plural(playlists.size, "playlist")].filter(Boolean).join(" and ")}`}
        </Button>
        <span className="text-xs text-text-muted">Songs you already have are not added twice.</span>
      </div>
    </section>
  );
}
