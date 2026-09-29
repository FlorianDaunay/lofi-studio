import { LoaderCircle, Palette, Play, SkipBack, SkipForward, Square } from "lucide-react";
import { useState } from "react";
import { ThemeDialog } from "@/components/appearance/ThemeDialog";
import { SongCover } from "@/components/library/SongCover";
import { cn } from "@/lib/utils";
import { togglePlay } from "@/state/bridge";
import { useNavigation } from "@/state/navigation";
import { playNext, playPrevious } from "@/state/playback";
import { useCurrentSong } from "@/state/selectors";
import { useStudio } from "@/state/studio";
import { NAV_ITEMS } from "./nav-items";

const iconButton = "flex h-10 w-10 shrink-0 items-center justify-center rounded-pill transition-colors active:bg-sidebar-hover";

/** The now-playing bar: cover, title, previous / play / next, always under the thumb. */
function PlayerBar() {
  const playing = useStudio((s) => s.playing);
  const starting = useStudio((s) => s.starting);
  const params = useStudio((s) => s.params);
  const song = useCurrentSong();
  const go = useNavigation((s) => s.go);
  const Icon = starting ? LoaderCircle : playing ? Square : Play;
  return (
    <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
      <button type="button" onClick={() => go("studio")} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Open the Studio">
        <SongCover params={params} className="w-10 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-sidebar-text-strong">{song?.name ?? "Custom sound"}</span>
          <span className="block text-[0.65rem] uppercase tracking-wider">{playing ? "Playing" : "Stopped"}</span>
        </span>
      </button>
      <button type="button" onClick={playPrevious} aria-label="Previous song" className={iconButton}>
        <SkipBack className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={starting}
        aria-label={playing ? "Stop" : "Play"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-foreground shadow-control disabled:opacity-60"
      >
        <Icon className={cn("h-5 w-5", !starting && "fill-current", starting && "animate-spin")} aria-hidden />
      </button>
      <button type="button" onClick={playNext} aria-label="Next song" className={iconButton}>
        <SkipForward className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** Phones: a player bar and a tab bar pinned to the bottom of the screen, clear of the system gesture area. */
export function MobileNav() {
  const page = useNavigation((s) => s.page);
  const go = useNavigation((s) => s.go);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const tab = "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-control py-1.5 text-[0.65rem] transition-colors";

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-text shadow-overlay md:hidden">
      <PlayerBar />
      <nav aria-label="Main" className="flex px-1 py-1">
        {NAV_ITEMS.map(({ page: target, label, icon: Icon }) => {
          const active = page === target;
          return (
            <button
              key={target}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => go(target)}
              className={cn(tab, active && "text-sidebar-text-active")}
            >
              <span className={cn("flex h-7 w-full max-w-12 items-center justify-center rounded-pill transition-colors", active && "bg-sidebar-active")}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => setAppearanceOpen(true)} className={tab}>
          <span className="flex h-7 w-full max-w-12 items-center justify-center" aria-hidden>
            <Palette className="h-4 w-4" />
          </span>
          <span className="max-w-full truncate">Theme</span>
        </button>
      </nav>
      <ThemeDialog open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </div>
  );
}
