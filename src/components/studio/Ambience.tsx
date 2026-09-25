import { CloudRain, Disc3, Wind, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { AmbienceParams } from "@/audio";
import { RANGES } from "@/state/ranges";
import { useStudio } from "@/state/studio";

const LAYERS: { key: keyof AmbienceParams; label: string; icon: LucideIcon; hint: string }[] = [
  { key: "rain", label: "Rain", icon: CloudRain, hint: "Filtered pink noise + droplets" },
  { key: "vinyl", label: "Vinyl", icon: Disc3, hint: "Random crackle and hiss" },
  { key: "wind", label: "Wind", icon: Wind, hint: "Slowly drifting brown noise" },
];

const DEFAULT_ON_LEVEL = 0.5;

export function Ambience() {
  const ambience = useStudio((s) => s.params.ambience);
  const setSection = useStudio((s) => s.setSection);

  return (
    <section aria-label="Ambience" className="surface p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Ambience</h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {LAYERS.map(({ key, label, icon: Icon, hint }) => {
          const level = ambience[key];
          const on = level > 0;
          return (
            <li key={key} className="flex items-center gap-3">
              <Button
                variant={on ? "primary" : "secondary"}
                size="icon"
                aria-pressed={on}
                aria-label={`${label} on/off`}
                title={hint}
                onClick={() => setSection("ambience", { [key]: on ? 0 : DEFAULT_ON_LEVEL })}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </Button>
              <Slider
                className="flex-1"
                label={label}
                {...RANGES.level}
                value={level}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setSection("ambience", { [key]: v })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
