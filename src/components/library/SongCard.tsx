import { Clock3, Copy, Download, Ellipsis, ListPlus, Metronome, Pencil, Pin, Play, Repeat, SlidersHorizontal, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { songSeconds } from "@/songs/playback";
import type { Song } from "@/songs/types";
import { SongCover } from "./SongCover";
import { songChords } from "./song-display";

interface SongCardProps {
  song: Song;
  /** The studio is currently based on this song. */
  current: boolean;
  /** The studio's sound is this song with unsaved edits. */
  modified: boolean;
  /** 1-based pinned slot, or `null` if not pinned. */
  pinnedSlot: number | null;
  onPlay: () => void;
  /** Shows the song in the Studio (the one already there is not reloaded: its edits stay). */
  onOpen: () => void;
  onPin: () => void;
  onPlaylist: () => void;
  onExport: () => void;
  /** Built-in songs are copied, the user's own are renamed and deleted. */
  onCopy?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

/** Bigger hit areas on touch screens. */
const touch = "[@media(pointer:coarse)]:h-10";

function Tag({ icon: Icon, accent, className, children }: { icon?: LucideIcon; accent?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded-pill px-2 py-0.5 text-xs",
        accent ? "bg-accent/10 text-accent" : "bg-surface-hover text-text-secondary",
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** A song of the library: what it is (length, tempo, loops, chords), Play, Open in Studio, and the rest in a menu. */
export function SongCard({ song, current, modified, pinnedSlot, onPlay, onOpen, onPin, onPlaylist, onExport, onCopy, onRename, onDelete }: SongCardProps) {
  const { params } = song;
  return (
    <li className={cn("surface flex min-w-0 flex-col gap-3 p-4", current && "border-accent bg-accent/10")}>
      <div className="flex items-start gap-3">
        <SongCover params={params} className="w-16 shrink-0 sm:w-[4.5rem]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 truncate text-sm font-semibold">{song.name}</h3>
            {modified && <span className="rounded-pill bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Modified</span>}
          </div>
          <p className="line-clamp-2 text-xs text-text-muted">{song.description || (song.builtIn ? "Built-in song." : "No description.")}</p>
        </div>
        {pinnedSlot !== null && (
          <span className="flex shrink-0 items-center gap-1 rounded-pill bg-accent/10 px-2 py-0.5 text-xs text-accent" title={`Pinned in slot ${pinnedSlot}`}>
            <Pin className="h-3 w-3" aria-hidden />
            {pinnedSlot}
            <span className="sr-only">(pinned in slot {pinnedSlot})</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Tag icon={Clock3} accent>
          <span className="sr-only">Length </span>
          {formatClock(songSeconds(params))}
        </Tag>
        <Tag icon={Metronome}>{params.bpm} BPM</Tag>
        <Tag icon={Repeat}>
          {params.loops} {params.loops === 1 ? "loop" : "loops"}
        </Tag>
        <Tag className="font-mono">{songChords(song)}</Tag>
      </div>

      {/* At the bottom, so the buttons of cards side by side line up whatever their tags. */}
      <div className="mt-auto flex flex-wrap items-center gap-1 border-t pt-3">
        <Button size="sm" variant="primary" className={touch} onClick={onPlay}>
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Play
        </Button>
        <Button size="sm" variant="ghost" className={touch} onClick={onOpen}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Open in Studio
        </Button>
        <span className="flex-1" />
        <DropdownMenu>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon" className="[@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10" aria-label={`More actions for ${song.name}`} title="More">
              <Ellipsis className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownTrigger>
          <DropdownContent className="min-w-56">
            <DropdownItem icon={<Pin className="h-4 w-4" />} label={pinnedSlot === null ? "Pin to the Studio" : "Change pinned slot"} onSelect={onPin} />
            <DropdownItem icon={<ListPlus className="h-4 w-4" />} label="Add to a playlist" onSelect={onPlaylist} />
            {onCopy && <DropdownItem icon={<Copy className="h-4 w-4" />} label="Save a copy" hint="In My songs, ready to edit" onSelect={onCopy} />}
            {onRename && <DropdownItem icon={<Pencil className="h-4 w-4" />} label="Rename" onSelect={onRename} />}
            <DropdownItem icon={<Download className="h-4 w-4" />} label="Export" hint="As a .lofi.json file" onSelect={onExport} />
            {onDelete && (
              <>
                <DropdownSeparator />
                <DropdownItem icon={<Trash2 className="h-4 w-4 text-danger" />} label="Delete" className="text-danger" onSelect={onDelete} />
              </>
            )}
          </DropdownContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
