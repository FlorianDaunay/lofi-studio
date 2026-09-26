import { themeToStyle, type Theme } from "@/themes";

const CELLS = [true, false, true, false, false, true, false, true];

/**
 * A miniature of the app painted with `theme`: its CSS variables are scoped to this element, so
 * the same Tailwind classes as the real UI render in the theme's own colors, shapes and shadows.
 */
export function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div
      aria-hidden
      style={{ ...themeToStyle(theme), fontFamily: "var(--font-sans)", backgroundImage: "var(--effect-canvas-image)" }}
      className="pointer-events-none flex h-28 overflow-hidden rounded-control border bg-canvas"
    >
      <div className="flex w-1/5 flex-col gap-1.5 border-r border-sidebar-border bg-sidebar p-2">
        <span className="h-2 w-2 rounded-pill bg-accent" />
        <span className="h-1.5 rounded-pill bg-sidebar-active" />
        <span className="h-1.5 rounded-pill bg-sidebar-text/40" />
        <span className="h-1.5 rounded-pill bg-sidebar-text/40" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        <span className="h-1.5 w-1/3 rounded-pill bg-text-primary" />
        <div className="surface flex flex-1 flex-col justify-between gap-1 p-2">
          <span className="h-1 w-3/4 rounded-pill bg-text-secondary/60" />
          <div className="flex gap-0.5">
            {CELLS.map((on, i) => (
              <span key={i} className={`h-2 flex-1 rounded-sm ${on ? "bg-accent" : "bg-surface-hover"}`} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 rounded-pill bg-surface-hover px-1.5 text-[7px] text-text-secondary">
              <span className="h-1 w-1 rounded-pill bg-success" />
              Playing
            </span>
            <span className="rounded-control bg-accent px-2 text-[7px] font-medium text-accent-foreground shadow-control">
              Play
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
