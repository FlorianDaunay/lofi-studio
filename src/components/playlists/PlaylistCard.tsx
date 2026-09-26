import { Copy, Pencil, Play, Trash2 } from "lucide-react";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { songSeconds } from "@/songs/playback";
import type { Playlist } from "@/songs/types";
import { playSource } from "@/state/playback";
import { usePlayer } from "@/state/player";
import { usePlaylistSongs } from "@/state/selectors";

export const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
};

interface PlaylistCardProps {
  playlist: Playlist;
  onOpen: () => void;
  /** Built-in playlists are copied, the user's own are renamed and deleted. */
  onCopy?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export function PlaylistCard({ playlist, onOpen, onCopy, onRename, onDelete }: PlaylistCardProps) {
  const songs = usePlaylistSongs(playlist);
  const active = usePlayer((s) => s.source.kind === "playlist" && s.source.id === playlist.id);
  const seconds = songs.reduce((total, song) => total + songSeconds(song.params), 0);

  return (
    <li className={cn("surface flex flex-col gap-3 p-3", active && "border-accent bg-accent/10")}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${playlist.name}`}
        className="block overflow-hidden rounded-tile transition-opacity hover:opacity-90"
      >
        <PlaylistCover songs={songs} className="w-full" />
      </button>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold">{playlist.name}</h3>
        {playlist.description && <p className="line-clamp-2 text-xs text-text-secondary">{playlist.description}</p>}
        <p className="text-xs text-text-muted">
          {songs.length} {songs.length === 1 ? "song" : "songs"}
          {songs.length > 0 && ` · ${formatDuration(seconds)}`}
        </p>
      </div>
      <div className="flex items-center gap-1 border-t pt-3">
        <Button size="sm" variant="primary" disabled={songs.length === 0} onClick={() => void playSource({ kind: "playlist", id: playlist.id })}>
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Play
        </Button>
        <span className="flex-1" />
        {onCopy && (
          <Button variant="ghost" size="icon" onClick={onCopy} aria-label={`Save a copy of ${playlist.name}`} title="Save an editable copy">
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
        )}
        {onRename && (
          <Button variant="ghost" size="icon" onClick={onRename} aria-label={`Rename ${playlist.name}`} title="Rename">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${playlist.name}`} title="Delete">
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
}
