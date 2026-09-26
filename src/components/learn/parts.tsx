import { Lightbulb, LoaderCircle, MousePointerClick, Play, Square } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { togglePlay } from "@/state/bridge";
import { useStudio } from "@/state/studio";

/** Paragraph text of a lesson. */
export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm leading-relaxed text-text-secondary", className)}>{children}</p>;
}

/** A term worth remembering. */
export function Term({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-text-primary">{children}</strong>;
}

/** The interactive part of a lesson: everything inside operates the real studio. */
export function Try({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card border border-accent/40 bg-accent/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        <MousePointerClick className="h-4 w-4" aria-hidden />
        {title}
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <aside className="flex gap-3 rounded-control border bg-surface-hover/50 p-3 text-sm text-text-secondary">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div>{children}</div>
    </aside>
  );
}

/** Play / stop, for lessons that need sound while you experiment. */
export function PlayChip() {
  const playing = useStudio((s) => s.playing);
  const starting = useStudio((s) => s.starting);
  const Icon = starting ? LoaderCircle : playing ? Square : Play;
  return (
    <Button size="sm" variant={playing ? "secondary" : "primary"} onClick={() => void togglePlay()} disabled={starting} className="self-start">
      <Icon className={cn("h-4 w-4", !starting && "fill-current", starting && "animate-spin")} aria-hidden />
      {playing ? "Stop the music" : "Play the music"}
    </Button>
  );
}
