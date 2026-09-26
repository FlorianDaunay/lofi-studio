import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SelectableTileProps {
  selected: boolean;
  onToggle: () => void;
  cover: ReactNode;
  title: string;
  meta: string;
  /** A short tag under the title ("Built-in", "Unsaved", "Already in your library"). */
  badge?: string;
}

/** A cover card that toggles in and out of a selection (checkbox semantics). */
export function SelectableTile({ selected, onToggle, cover, title, meta, badge }: SelectableTileProps) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className={cn(
          "group relative flex w-full flex-col gap-2 rounded-card border p-2 text-left transition-all hover:bg-surface-hover",
          selected ? "border-accent bg-accent/10" : "border-transparent",
        )}
      >
        <span className={cn("relative block transition-transform motion-safe:group-active:scale-[0.97]", !selected && "opacity-80 group-hover:opacity-100")}>
          {cover}
          <span
            aria-hidden
            className={cn(
              "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-pill border shadow-control transition-all",
              selected ? "border-accent bg-accent text-accent-foreground" : "border-2 border-surface/90 bg-transparent text-transparent shadow-none",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        </span>
        <span className="min-w-0 px-0.5">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-text-muted">{meta}</span>
          {badge && <span className="mt-1 inline-block rounded-pill bg-surface-hover px-2 py-0.5 text-[0.65rem] text-text-secondary">{badge}</span>}
        </span>
      </button>
    </li>
  );
}
