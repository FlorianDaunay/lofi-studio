import { Check, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_PLAYLISTS, MAX_SONG_NAME, type Song } from "@/songs/types";
import { useLibrary } from "@/state/library";

interface PlaylistPickerProps {
  /** The song to add or remove, or `null` when closed. */
  song: Song | null;
  onClose: () => void;
}

function Lists({ song }: { song: Song }) {
  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const [name, setName] = useState("");

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && createPlaylist(name, [song.id])) setName("");
  };

  return (
    <div className="flex flex-col">
      <ul className="max-h-72 overflow-y-auto p-2">
        {playlists.length === 0 && <li className="px-3 py-6 text-center text-sm text-text-muted">No playlist yet. Create the first one below.</li>}
        {playlists.map((list) => {
          const inside = list.songIds.includes(song.id);
          return (
            <li key={list.id}>
              <button
                type="button"
                aria-pressed={inside}
                onClick={() => (inside ? removeFromPlaylist(list.id, song.id) : addToPlaylist(list.id, song.id))}
                className={cn("flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover", inside && "bg-accent/10")}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-control border" aria-hidden>
                  {inside && <Check className="h-3.5 w-3.5 text-accent" />}
                </span>
                <span className="flex-1 truncate">{list.name}</span>
                <span className="text-xs text-text-muted">{list.songIds.length}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={create} className="flex gap-2 border-t p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_SONG_NAME} placeholder="New playlist…" aria-label="New playlist name" disabled={playlists.length >= MAX_PLAYLISTS} />
        <Button type="submit" variant="primary" disabled={!name.trim() || playlists.length >= MAX_PLAYLISTS} aria-label="Create playlist with this song">
          <Plus className="h-4 w-4" aria-hidden />
          Create
        </Button>
      </form>
    </div>
  );
}

/** Tick the playlists a song belongs to, or start a new one with it. */
export function PlaylistPicker({ song, onClose }: PlaylistPickerProps) {
  return (
    <Dialog
      open={song !== null}
      onOpenChange={(open) => !open && onClose()}
      title={song ? `Playlists for “${song.name}”` : "Playlists"}
      description="Tick a playlist to add the song, untick to remove it."
      className="w-[min(92vw,26rem)]"
    >
      {song && <Lists song={song} />}
    </Dialog>
  );
}
