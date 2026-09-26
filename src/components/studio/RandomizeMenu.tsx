import { AudioLines, ChevronDown, Dices, Drum, Music, Shuffle, Undo2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import type { RandomizeKind } from "@/songs/randomize";
import { useStudio } from "@/state/studio";

const OPTIONS: { kind: RandomizeKind; label: string; hint: string; icon: LucideIcon }[] = [
  { kind: "groove", label: "New groove", hint: "A new rhythm. Chords and sound stay.", icon: Drum },
  { kind: "chords", label: "New chords", hint: "Another jazzy progression, same groove.", icon: Music },
  { kind: "sound", label: "New sound", hint: "Keys tone, effects and ambience.", icon: AudioLines },
  { kind: "surprise", label: "Surprise me", hint: "All of the above, plus tempo and swing.", icon: Dices },
];

/** One button, one menu: pick how much of the song to reshuffle. Volume and levels are never touched. */
export function RandomizeMenu() {
  const randomize = useStudio((s) => s.randomize);
  const undoRandomize = useStudio((s) => s.undoRandomize);
  const canUndo = useStudio((s) => s.history.length > 0);

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button size="sm">
          <Shuffle className="h-4 w-4" aria-hidden />
          Randomize
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        {OPTIONS.map(({ kind, label, hint, icon: Icon }) => (
          <DropdownItem key={kind} icon={<Icon className="h-4 w-4" />} label={label} hint={hint} onSelect={() => randomize(kind)} />
        ))}
        <DropdownSeparator />
        <DropdownItem
          icon={<Undo2 className="h-4 w-4" />}
          label="Undo"
          hint="Go back before the last randomize."
          disabled={!canUndo}
          onSelect={undoRandomize}
        />
      </DropdownContent>
    </DropdownMenu>
  );
}
