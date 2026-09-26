import { ArrowDown, ArrowLeft, ArrowUp, Copy, Pencil, Play, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { SongCover } from "@/components/library/SongCover";
import { songChords } from "@/components/library/song-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { songSeconds } from "@/songs/playback";
import type { Playlist } from "@/songs/types";
import { useLibrary } from "@/state/library";
import { playSource } from "@/state/playback";
import { useAllSongs, usePlaylistSongs } from "@/state/selectors";
import { useStudio } from "@/state/studio";
import { formatDuration } from "./PlaylistCard";

interface PlaylistDetailProps {
  playlist: Playlist;
  onBack: () => void;
  onRename: () => void;
  /** Saves an editable copy (offered for built-in playlists, which are read-only). */
  onCopy: () => void;
}

/** One playlist: its songs (reorder, remove, play from here) and a search to add more. Built-in ones are read-only. */
export function PlaylistDetail({ playlist, onBack, onRename, onCopy }: PlaylistDetailProps) {
  const editable = !playlist.builtIn;
  const songs = usePlaylistSongs(playlist);
  const everySong = useAllSongs();
  const currentId = useStudio((s) => s.songId);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const moveInPlaylist = useLibrary((s) => s.moveInPlaylist);
  const [query, setQuery] = useState("");

  const source = { kind: "playlist", id: playlist.id } as const;
  const seconds = songs.reduce((total, song) => total + songSeconds(song.params), 0);
  const needle = query.trim().toLowerCase();
  const candidates = everySong.filter((song) => !playlist.songIds.includes(song.id) && (!needle || song.name.toLowerCase().includes(needle)));

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All playlists
      </Button>

      <section className="surface flex flex-wrap items-center gap-5 p-5" aria-label="Playlist">
        <PlaylistCover songs={songs} className="w-36 shrink-0 sm:w-44" />
        <div className="min-w-48 flex-1">
          <p className="text-xs uppercase tracking-wider text-text-muted">{editable ? "Playlist" : "Built-in playlist"}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{playlist.name}</h1>
          {playlist.description && <p className="text-sm text-text-secondary">{playlist.description}</p>}
          <p className="text-sm text-text-muted">
            {songs.length} {songs.length === 1 ? "song" : "songs"}
            {songs.length > 0 && ` · about ${formatDuration(seconds)}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" disabled={songs.length === 0} onClick={() => void playSource(source)}>
              <Play className="h-4 w-4 fill-current" aria-hidden />
              Play
            </Button>
            {editable ? (
              <Button onClick={onRename}>
                <Pencil className="h-4 w-4" aria-hidden />
                Rename
              </Button>
            ) : (
              <Button onClick={onCopy}>
                <Copy className="h-4 w-4" aria-hidden />
                Save a copy to edit
              </Button>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Songs in this playlist">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Songs ({songs.length})</h2>
        {songs.length === 0 ? (
          <p className="surface p-6 text-center text-sm text-text-muted">Empty for now. Add songs from the list below.</p>
        ) : (
          <ol className="surface divide-y">
            {songs.map((song, index) => (
              <li key={song.id} className={cn("flex items-center gap-3 p-2 pr-3", song.id === currentId && "bg-accent/10")}>
                <span className="w-5 text-center font-mono text-xs text-text-muted">{index + 1}</span>
                <SongCover params={song.params} className="w-10 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{song.name}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {song.params.bpm} BPM · {songChords(song)}
                  </span>
                </span>
                <Button variant="ghost" size="icon" onClick={() => void playSource(source, song.id)} aria-label={`Play ${song.name}`} title="Play from here">
                  <Play className="h-4 w-4" aria-hidden />
                </Button>
                {editable && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveInPlaylist(playlist.id, index, index - 1)}
                      aria-label={`Move ${song.name} up`}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === songs.length - 1}
                      onClick={() => moveInPlaylist(playlist.id, index, index + 1)}
                      aria-label={`Move ${song.name} down`}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromPlaylist(playlist.id, song.id)}
                      aria-label={`Remove ${song.name} from the playlist`}
                      title="Remove"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {editable && (
        <section aria-label="Add songs">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Add songs</h2>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs…" aria-label="Search songs to add" className="pl-9" />
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-text-muted">{needle ? `No other song matches “${query}”.` : "Every song is already in this playlist."}</p>
          ) : (
            <ul className="surface max-h-80 divide-y overflow-y-auto">
              {candidates.map((song) => (
                <li key={song.id} className="flex items-center gap-3 p-2 pr-3">
                  <SongCover params={song.params} className="w-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{song.name}</span>
                    <span className="block truncate text-xs text-text-muted">{song.params.bpm} BPM</span>
                  </span>
                  <Button size="sm" onClick={() => addToPlaylist(playlist.id, song.id)} aria-label={`Add ${song.name}`}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
