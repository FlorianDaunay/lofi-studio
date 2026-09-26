import { ArrowLeftRight, Library, LoaderCircle, Palette, Play, SlidersHorizontal, Square, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ThemeDialog } from "@/components/appearance/ThemeDialog";
import { cn } from "@/lib/utils";
import { togglePlay } from "@/state/bridge";
import { useNavigation, type Page } from "@/state/navigation";
import { useCurrentSong } from "@/state/selectors";
import { useStudio } from "@/state/studio";
import { useActiveTheme } from "@/themes";

const ITEMS: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: "studio", label: "Studio", icon: SlidersHorizontal },
  { page: "library", label: "Library", icon: Library },
  { page: "share", label: "Import / Export", icon: ArrowLeftRight },
];

const itemClass =
  "flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors hover:bg-sidebar-hover hover:text-sidebar-text-strong";

/** Play / stop and the current song, reachable from every page. */
function MiniPlayer() {
  const playing = useStudio((s) => s.playing);
  const starting = useStudio((s) => s.starting);
  const song = useCurrentSong();
  const Icon = starting ? LoaderCircle : playing ? Square : Play;
  return (
    <div className="flex items-center gap-3 rounded-card border border-sidebar-border p-2">
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={starting}
        aria-label={playing ? "Stop" : "Play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-foreground shadow-control transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        <Icon className={cn("h-4 w-4", !starting && "fill-current", starting && "animate-spin")} aria-hidden />
      </button>
      <span className="hidden min-w-0 md:block">
        <span className="block text-[0.65rem] uppercase tracking-wider">{playing ? "Playing" : "Stopped"}</span>
        <span className="block truncate text-sm font-medium text-sidebar-text-strong">{song?.name ?? "Custom sound"}</span>
      </span>
    </div>
  );
}

export function Sidebar() {
  const page = useNavigation((s) => s.page);
  const go = useNavigation((s) => s.go);
  const theme = useActiveTheme();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <aside className="flex w-16 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-2 text-sidebar-text md:w-60 md:p-3">
      <div className="flex items-center gap-3 px-1 pt-1 md:px-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tile bg-accent text-accent-foreground" aria-hidden>
          <Play className="h-4 w-4 fill-current" />
        </span>
        <span className="hidden md:block">
          <span className="block text-sm font-semibold text-sidebar-text-strong">Lofi Studio</span>
          <span className="block text-xs">No samples, all synth</span>
        </span>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {ITEMS.map(({ page: target, label, icon: Icon }) => {
          const active = page === target;
          return (
            <button
              key={target}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
              onClick={() => go(target)}
              className={cn(itemClass, active && "bg-sidebar-active text-sidebar-text-active hover:bg-sidebar-active hover:text-sidebar-text-active")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden md:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      <MiniPlayer />

      <button type="button" onClick={() => setAppearanceOpen(true)} aria-label="Appearance" title="Appearance" className={itemClass}>
        <Palette className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden min-w-0 md:block">
          <span className="block text-left">Appearance</span>
          <span className="block truncate text-left text-xs text-text-muted">{theme.name}</span>
        </span>
      </button>
      <ThemeDialog open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </aside>
  );
}
