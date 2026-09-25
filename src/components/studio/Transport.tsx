import { LoaderCircle, Play, Shuffle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RANGES } from "@/state/ranges";
import { togglePlay } from "@/state/bridge";
import { findPreset } from "@/state/presets";
import { useStudio } from "@/state/studio";

export function Transport() {
  const playing = useStudio((s) => s.playing);
  const starting = useStudio((s) => s.starting);
  const error = useStudio((s) => s.error);
  const bpm = useStudio((s) => s.params.bpm);
  const volume = useStudio((s) => s.params.volume);
  const presetName = useStudio((s) => findPreset(s.presetId)?.name ?? "Custom loop");
  const setGlobal = useStudio((s) => s.setGlobal);
  const regenerate = useStudio((s) => s.regenerate);

  return (
    <section aria-label="Transport" className="surface flex flex-wrap items-center gap-5 p-5">
      <Button
        variant="primary"
        size="hero"
        onClick={() => void togglePlay()}
        disabled={starting}
        aria-label={playing ? "Stop" : "Play"}
      >
        {starting ? (
          <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden />
        ) : playing ? (
          <Square className="h-6 w-6 fill-current" aria-hidden />
        ) : (
          <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />
        )}
      </Button>

      <div className="min-w-40 flex-1">
        <p className="text-xs uppercase tracking-wider text-text-muted">{playing ? "Now playing" : "Ready"}</p>
        <h2 className="text-xl font-semibold">{presetName}</h2>
        <p className="font-mono text-xs text-text-secondary">{bpm} BPM</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-64">
        <Slider
          label="Volume"
          {...RANGES.volume}
          value={volume}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setGlobal({ volume: v })}
        />
        <Button size="sm" onClick={regenerate}>
          <Shuffle className="h-4 w-4" aria-hidden />
          New groove
        </Button>
      </div>
    </section>
  );
}
