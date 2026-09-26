import { ListMusic } from "lucide-react";
import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { coverScene } from "@/songs/cover";
import type { Song } from "@/songs/types";
import { CoverScenery } from "./cover/CoverScenery";

/** More slices than this would be too thin to tell apart. */
const MAX_SLICES = 5;

/** Songs spread evenly over the playlist, so a long playlist is still represented end to end. */
const pick = (songs: readonly Song[]): Song[] =>
  songs.length <= MAX_SLICES ? [...songs] : Array.from({ length: MAX_SLICES }, (_, i) => songs[Math.round((i * (songs.length - 1)) / (MAX_SLICES - 1))]!);

interface PlaylistCoverProps {
  songs: readonly Song[];
  className?: string;
}

/**
 * A playlist's cover is a strip of vertical slices, one per song (up to five), each cut from that
 * song's own cover. Adding a song changes one slice; a playlist of similar songs looks uniform.
 */
export function PlaylistCover({ songs, className }: PlaylistCoverProps) {
  const id = useId().replace(/:/g, "");
  const slices = useMemo(() => pick(songs).map((song) => ({ key: song.id, scene: coverScene(song.params) })), [songs]);

  if (slices.length === 0) {
    return (
      <div aria-hidden className={cn("flex aspect-square items-center justify-center rounded-tile bg-surface-hover text-text-muted", className)}>
        <ListMusic className="h-1/3 w-1/3" />
      </div>
    );
  }

  const width = 100 / slices.length;
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("block aspect-square overflow-hidden rounded-tile text-canvas", className)}>
      {slices.map(({ key, scene }, i) => (
        // A nested svg clips its content to its own box, so each slice shows the middle of its song's cover.
        <svg key={`${key}-${i}`} x={i * width} width={width} height="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <CoverScenery scene={scene} id={`${id}-${i}`} />
        </svg>
      ))}
      {slices.slice(1).map((_, i) => (
        <line key={i} x1={(i + 1) * width} x2={(i + 1) * width} y1="0" y2="100" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      ))}
    </svg>
  );
}
