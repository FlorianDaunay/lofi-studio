import { LoaderCircle, Maximize2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { STEPS } from "@/audio";
import { SongCover } from "@/components/library/SongCover";
import { cn } from "@/lib/utils";
import { hideToTray, setWindowMode } from "@/lib/window";
import { togglePlay } from "@/state/bridge";
import { playNext, playPrevious } from "@/state/playback";
import { useCurrentSong, useSourceName } from "@/state/selectors";
import { useStudio } from "@/state/studio";

const smallButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-pill transition-colors hover:bg-sidebar-hover hover:text-sidebar-text-strong";
const windowButton =
  "flex h-6 w-6 items-center justify-center rounded-control text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-sidebar-text-strong";

/** Where the loop is: a thin line along the bottom edge. Only this element re-renders on each step. */
function LoopProgress() {
  // Empty when stopped: playing again starts the loop from the top.
  const fraction = useStudio((s) =>
    !s.playing || s.bar < 0 ? 0 : (s.bar * STEPS + s.step + 1) / (s.params.progression.length * STEPS),
  );
  return (
    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sidebar-border" aria-hidden>
      <div className="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-100" style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}

/**
 * Desktop: the whole window as a small always-on-top player. The window has no title bar, so the
 * empty areas drag it (`data-tauri-drag-region` applies to the element itself, not its children).
 */
export function MiniPlayer() {
  const playing = useStudio((s) => s.playing);
  const starting = useStudio((s) => s.starting);
  const params = useStudio((s) => s.params);
  const song = useCurrentSong();
  const sourceName = useSourceName();
  const PlayIcon = starting ? LoaderCircle : playing ? Pause : Play;

  return (
    <div data-tauri-drag-region className="relative flex h-full select-none items-center gap-3 overflow-hidden bg-sidebar p-3 text-sidebar-text">
      <SongCover params={params} className="pointer-events-none h-16 w-16 shrink-0" />

      <div data-tauri-drag-region className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <span data-tauri-drag-region className="min-w-0">
          <span data-tauri-drag-region className="block truncate text-sm font-medium text-sidebar-text-strong">
            {song?.name ?? "Custom sound"}
          </span>
          <span data-tauri-drag-region className="block truncate text-xs">
            {sourceName}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={playPrevious} aria-label="Previous song" title="Previous song" className={smallButton}>
            <SkipBack className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void togglePlay()}
            disabled={starting}
            aria-label={playing ? "Pause" : "Play"}
            title={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-foreground shadow-control transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <PlayIcon className={cn("h-4 w-4", !starting && "fill-current", starting && "animate-spin")} aria-hidden />
          </button>
          <button type="button" onClick={playNext} aria-label="Next song" title="Next song" className={smallButton}>
            <SkipForward className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </div>

      <div className="flex shrink-0 flex-col gap-1 self-start">
        <button type="button" onClick={() => void setWindowMode("full")} aria-label="Open Lofi Studio" title="Open Lofi Studio" className={windowButton}>
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => void hideToTray()}
          aria-label="Hide to the tray"
          title="Hide to the tray (music keeps playing)"
          className={windowButton}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <LoopProgress />
    </div>
  );
}
