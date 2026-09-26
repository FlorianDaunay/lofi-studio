import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "instruments", label: "Instruments", text: "A piano-like synth, a bass and three drum sounds, all calculated on the fly from waves and noise." },
  { id: "room", label: "Room", text: "Reverb: a short echo that makes the sound feel like it happens in a small space." },
  { id: "warmth", label: "Warmth", text: "A touch of soft distortion, like an amplifier working a little too hard." },
  { id: "muffle", label: "Muffle", text: "A low-pass filter cuts the high frequencies, which is why lo-fi sounds like it comes from behind a wall." },
  { id: "tape", label: "Tape wobble", text: "The pitch drifts slightly, like a worn cassette." },
  { id: "glue", label: "Glue", text: "A compressor evens out the volume so the loop sits together." },
  { id: "master", label: "Volume", text: "Your master volume, with a limiter that stops anything from getting too loud." },
] as const;

const AMBIENCE_TEXT =
  "Rain, vinyl and wind skip the muffling: they join right before the volume, so the rain keeps its sparkle even in a very muffled song.";

/** The whole signal path as a row of clickable stages; ambience is drawn joining near the end. */
export function SignalFlow() {
  const [selected, setSelected] = useState<string>(STAGES[0].id);
  const stage = STAGES.find((s) => s.id === selected);
  const text = selected === "ambience" ? AMBIENCE_TEXT : stage?.text;

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-center gap-1" aria-label="Signal path">
        {STAGES.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={selected === s.id}
              onClick={() => setSelected(s.id)}
              className={cn(
                "rounded-control border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover",
                selected === s.id ? "border-accent bg-accent/10 text-accent" : "bg-surface",
              )}
            >
              {s.label}
            </button>
            {i < STAGES.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-text-muted" aria-hidden />}
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={selected === "ambience"}
          onClick={() => setSelected("ambience")}
          className={cn(
            "rounded-control border border-dashed px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover",
            selected === "ambience" ? "border-accent bg-accent/10 text-accent" : "bg-surface",
          )}
        >
          Ambience
        </button>
        <span className="text-xs text-text-muted">joins just before the volume</span>
      </div>
      <p role="status" className="min-h-12 rounded-control border bg-canvas p-3 text-sm text-text-secondary">
        {text}
      </p>
    </div>
  );
}
