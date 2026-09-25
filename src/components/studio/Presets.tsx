import { CloudRain, Coffee, Moon, Wind, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESETS, type Preset } from "@/state/presets";
import { useStudio } from "@/state/studio";

const ICONS: Record<Preset["icon"], LucideIcon> = { rain: CloudRain, moon: Moon, wind: Wind, coffee: Coffee };

/** One-click moods: each sets the tempo, chords, groove, sound and ambience together. */
export function Presets() {
  const presetId = useStudio((s) => s.presetId);
  const applyPreset = useStudio((s) => s.applyPreset);

  return (
    <section aria-label="Presets">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Presets</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PRESETS.map((preset) => {
          const Icon = ICONS[preset.icon];
          const selected = preset.id === presetId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "surface flex flex-col items-start gap-2 p-4 text-left transition-colors hover:bg-surface-hover",
                selected && "border-accent bg-accent/10",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-tile",
                  selected ? "bg-accent text-accent-foreground" : "bg-surface-hover text-accent",
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-medium">{preset.name}</span>
                <span className="block text-xs text-text-muted">{preset.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
