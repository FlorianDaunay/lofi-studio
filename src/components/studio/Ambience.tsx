import { X } from "lucide-react";
import { AMBIENCE_LAYERS, type AmbienceLayerId } from "@/audio";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { SILENT_AMBIENCE } from "@/songs/params";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { AMBIENCE_GROUPS, AMBIENCE_LABELS } from "./ambience-labels";

const DEFAULT_ON_LEVEL = 0.5;
const percent = (v: number) => `${Math.round(v * 100)}%`;

/** A layer of the picker: a toggle chip. Selects its own level only, so moving one slider re-renders one chip. */
function LayerChip({ id }: { id: AmbienceLayerId }) {
  const on = useStudio((s) => s.params.ambience[id] > 0);
  const setSection = useStudio((s) => s.setSection);
  const { label, icon: Icon, hint } = AMBIENCE_LABELS[id];
  return (
    <button
      type="button"
      aria-pressed={on}
      title={hint}
      onClick={() => setSection("ambience", { [id]: on ? 0 : DEFAULT_ON_LEVEL })}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-xs font-medium transition-colors [@media(pointer:coarse)]:h-10",
        on ? "border-accent bg-accent/15 text-text-primary" : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", on && "text-accent")} aria-hidden />
      {label}
    </button>
  );
}

function LayerLevel({ id }: { id: AmbienceLayerId }) {
  const level = useStudio((s) => s.params.ambience[id]);
  const setSection = useStudio((s) => s.setSection);
  const { label, icon: Icon } = AMBIENCE_LABELS[id];
  return (
    <li className="flex items-center gap-3">
      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-accent/10 text-accent min-[400px]:flex" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <Slider className="min-w-0 flex-1" label={label} {...RANGES.level} value={level} format={percent} onChange={(v) => setSection("ambience", { [id]: v })} />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Turn ${label.toLowerCase()} off`} title="Turn off" onClick={() => setSection("ambience", { [id]: 0 })}>
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}

/** Background sounds: pick layers from the chips, then balance the ones that are on. */
export function Ambience() {
  // A joined string changes only when a layer is turned on or off, not while a slider moves.
  const active = useStudio((s) => AMBIENCE_LAYERS.filter((id) => s.params.ambience[id] > 0).join(" "));
  const setSection = useStudio((s) => s.setSection);
  const activeIds = active ? (active.split(" ") as AmbienceLayerId[]) : [];

  return (
    <section aria-label="Ambience" className="surface flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">Ambience</h2>
        {activeIds.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSection("ambience", SILENT_AMBIENCE)}>
            Turn all off
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {AMBIENCE_GROUPS.map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-1.5">
            <span className="text-[11px] text-text-muted">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.layers.map((id) => (
                <LayerChip key={id} id={id} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeIds.length > 0 ? (
        <ul aria-label="Levels" className="grid grid-cols-1 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2">
          {activeIds.map((id) => (
            <LayerLevel key={id} id={id} />
          ))}
        </ul>
      ) : (
        <p className="border-t pt-3 text-xs text-text-muted">Pick a sound above to layer it under the music.</p>
      )}
    </section>
  );
}
