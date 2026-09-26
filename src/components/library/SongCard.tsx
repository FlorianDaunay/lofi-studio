import { Copy, Download, ListPlus, Pencil, Pin, Play, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Song } from "@/songs/types";
import { SongCover } from "./SongCover";
import { songChords } from "./song-display";

interface SongCardProps {
  song: Song;
  /** The studio is currently based on this song. */
  current: boolean;
  /** 1-based pinned slot, or `null` if not pinned. */
  pinnedSlot: number | null;
  onLoad: () => void;
  onPin: () => void;
  onPlaylist: () => void;
  onExport: () => void;
  /** Built-in songs are copied, the user's own are edited and deleted. */
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label} title={label}>
      {children}
    </Button>
  );
}

export function SongCard({ song, current, pinnedSlot, onLoad, onPin, onPlaylist, onExport, onCopy, onEdit, onDelete }: SongCardProps) {
  return (
    <li className={cn("surface flex flex-col gap-3 p-4", current && "border-accent bg-accent/10")}>
      <div className="flex items-start gap-3">
        <SongCover params={song.params} className="w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{song.name}</h3>
          <p className="line-clamp-2 min-h-8 text-xs text-text-muted">{song.description || "No description."}</p>
        </div>
        {pinnedSlot !== null && (
          <span className="flex items-center gap-1 rounded-pill bg-accent/10 px-2 py-0.5 text-xs text-accent" title={`Pinned in slot ${pinnedSlot}`}>
            <Pin className="h-3 w-3" aria-hidden />
            {pinnedSlot}
          </span>
        )}
      </div>

      <p className="truncate font-mono text-xs text-text-secondary">
        {song.params.bpm} BPM · {songChords(song)}
      </p>

      <div className="flex items-center gap-1 border-t pt-3">
        <Button size="sm" variant={current ? "secondary" : "primary"} onClick={onLoad}>
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          {current ? "Loaded" : "Load"}
        </Button>
        <span className="flex-1" />
        <IconAction label={`Pin ${song.name}`} onClick={onPin}>
          <Pin className="h-4 w-4" aria-hidden />
        </IconAction>
        <IconAction label={`Add ${song.name} to a playlist`} onClick={onPlaylist}>
          <ListPlus className="h-4 w-4" aria-hidden />
        </IconAction>
        {onCopy && (
          <IconAction label={`Save a copy of ${song.name}`} onClick={onCopy}>
            <Copy className="h-4 w-4" aria-hidden />
          </IconAction>
        )}
        {onEdit && (
          <IconAction label={`Rename ${song.name}`} onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden />
          </IconAction>
        )}
        <IconAction label={`Export ${song.name}`} onClick={onExport}>
          <Download className="h-4 w-4" aria-hidden />
        </IconAction>
        {onDelete && (
          <IconAction label={`Delete ${song.name}`} onClick={onDelete}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </IconAction>
        )}
      </div>
    </li>
  );
}
