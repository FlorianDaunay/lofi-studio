import { ListMusic, Plus, X } from "lucide-react";
import { chordName, type ChordQuality } from "@/audio";
import { Button } from "@/components/ui/button";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/dropdown";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CHORD_QUALITIES } from "@/audio/types";
import { MAX_BARS, MIN_BARS, QUALITY_INFO, ROOTS, withBarAdded, withBarRemoved, withChord } from "@/songs/chords";
import { PROGRESSIONS } from "@/songs/randomize";
import { useStudio } from "@/state/studio";

/** One bar: its chord, two selects to change it, and a highlight while it plays. */
function BarCard({ index }: { index: number }) {
  const chord = useStudio((s) => s.params.progression[index]);
  const bars = useStudio((s) => s.params.progression.length);
  const active = useStudio((s) => s.bar === index);
  const progression = useStudio((s) => s.params.progression);
  const setProgression = useStudio((s) => s.setProgression);
  if (!chord) return null;

  return (
    <li
      role="group"
      aria-label={`Bar ${index + 1}: ${chordName(chord)}`}
      className={cn("flex flex-col gap-2 rounded-card border bg-canvas p-3 transition-colors", active && "border-accent bg-accent/10")}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wider text-text-muted">Bar {index + 1}</span>
        {bars > MIN_BARS && (
          <button
            type="button"
            onClick={() => setProgression(withBarRemoved(progression, index))}
            aria-label={`Remove bar ${index + 1}`}
            className="-m-1 rounded-control p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      <p className="font-mono text-2xl font-semibold">{chordName(chord)}</p>
      <Select label={`Bar ${index + 1} root note`} value={chord.pc} onChange={(e) => setProgression(withChord(progression, index, { pc: Number(e.target.value) }))}>
        {ROOTS.map(({ pc, name }) => (
          <option key={pc} value={pc}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        label={`Bar ${index + 1} chord type`}
        value={chord.quality}
        onChange={(e) => setProgression(withChord(progression, index, { quality: e.target.value as ChordQuality }))}
      >
        {CHORD_QUALITIES.map((quality) => (
          <option key={quality} value={quality}>
            {QUALITY_INFO[quality].label}
          </option>
        ))}
      </Select>
      <p className="min-h-8 text-xs text-text-muted">{QUALITY_INFO[chord.quality].mood}</p>
    </li>
  );
}

/** Edit the progression: one chord per bar, up to eight bars, or start from a ready-made one. */
export function ChordEditor() {
  const bars = useStudio((s) => s.params.progression.length);
  const progression = useStudio((s) => s.params.progression);
  const setProgression = useStudio((s) => s.setProgression);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">One chord per bar, played in a loop. The bass follows the root of each chord.</p>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button size="sm">
                <ListMusic className="h-4 w-4" aria-hidden />
                Load a progression
              </Button>
            </DropdownTrigger>
            <DropdownContent className="max-h-80 overflow-y-auto">
              {PROGRESSIONS.map((chords) => (
                <DropdownItem
                  key={chords.map(chordName).join(" ")}
                  icon={<ListMusic className="h-4 w-4" />}
                  label={chords.map(chordName).join("  ")}
                  className="font-mono"
                  onSelect={() => setProgression([...chords])}
                />
              ))}
            </DropdownContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setProgression(withBarAdded(progression))} disabled={bars >= MAX_BARS}>
            <Plus className="h-4 w-4" aria-hidden />
            Add bar
          </Button>
        </div>
      </div>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
        {Array.from({ length: bars }, (_, index) => (
          <BarCard key={index} index={index} />
        ))}
      </ol>
    </div>
  );
}
