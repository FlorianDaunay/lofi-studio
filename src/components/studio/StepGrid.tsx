import { STEPS, TRACKS, type TrackId } from "@/audio";
import { cn } from "@/lib/utils";
import { useStudio } from "@/state/studio";

const TRACK_LABELS: Record<TrackId, string> = {
  kick: "Kick",
  snare: "Snare",
  hat: "Hi-hat",
  perc: "Perc",
  bass: "Bass",
  keys: "Keys",
  lead: "Melody",
};

const stepIndexes = Array.from({ length: STEPS }, (_, i) => i);

/** One cell. Only the two cells whose playhead state flips re-render on each step. */
function Cell({ track, index }: { track: TrackId; index: number }) {
  const on = useStudio((s) => s.params.pattern[track][index]);
  const current = useStudio((s) => s.step === index);
  const toggleStep = useStudio((s) => s.toggleStep);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${TRACK_LABELS[track]}, step ${index + 1}`}
      onClick={() => toggleStep(track, index)}
      className={cn(
        "h-8 min-w-0 flex-1 rounded-control border transition-colors",
        index % 4 === 0 && "ml-1.5 first:ml-0",
        on ? "border-accent bg-accent" : "bg-surface-hover hover:bg-border",
        current && (on ? "brightness-125" : "border-accent"),
      )}
    />
  );
}

export function StepGrid() {
  return (
    <div className="flex flex-col gap-3">
      {/* On a phone the 16 steps would be too thin to tap: the grid keeps a usable size and scrolls sideways. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-[34rem] flex-col gap-1.5" role="group" aria-label="Step sequencer, 16 steps">
          {TRACKS.map((track) => (
            <div key={track} className="flex items-center gap-3">
              <span className="sticky left-0 z-10 w-14 shrink-0 bg-surface text-xs text-text-secondary">{TRACK_LABELS[track]}</span>
              <div className="flex flex-1 gap-1">
                {stepIndexes.map((index) => (
                  <Cell key={index} track={track} index={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
