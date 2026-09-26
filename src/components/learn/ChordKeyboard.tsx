import { useState } from "react";
import { chordMidiNotes, chordName } from "@/audio";
import { cn } from "@/lib/utils";
import { useStudio } from "@/state/studio";

const FIRST = 36; // C2
const LAST = 83; // B5
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const isWhite = (midi: number) => WHITE_PCS.includes(midi % 12);
const whites = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).filter(isWhite);
const KEY_WIDTH = 100 / whites.length;

/**
 * A piano that lights up the notes of a bar's chord: the bass root in one color, the notes the keys
 * play in another. Follows the bar that is playing, or the one picked with the buttons.
 */
export function ChordKeyboard() {
  const progression = useStudio((s) => s.params.progression);
  const playingBar = useStudio((s) => s.bar);
  const [picked, setPicked] = useState(0);

  const index = Math.min(playingBar >= 0 ? playingBar : picked, progression.length - 1);
  const chord = progression[index];
  if (!chord) return null;
  const { keys, bass } = chordMidiNotes(chord);

  const state = (midi: number) => (midi === bass ? "bass" : keys.includes(midi) ? "keys" : "off");
  const fill = { bass: "fill-warning", keys: "fill-accent", off: "" } as const;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-secondary">Show the notes of</span>
        {progression.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === index}
            onClick={() => setPicked(i)}
            className={cn("rounded-control border px-2.5 py-1 font-mono text-xs transition-colors hover:bg-surface-hover", i === index && "border-accent bg-accent/10 text-accent")}
          >
            {i + 1}: {chordName(c)}
          </button>
        ))}
        {playingBar >= 0 && <span className="text-xs text-text-muted">(following the music)</span>}
      </div>

      <svg viewBox="0 0 100 26" role="img" aria-label={`Piano keys for ${chordName(chord)}`} className="w-full rounded-control border bg-canvas p-1">
        {whites.map((midi, i) => (
          <rect
            key={midi}
            x={i * KEY_WIDTH}
            y={0}
            width={KEY_WIDTH}
            height={26}
            className={cn("stroke-border", state(midi) === "off" ? "fill-white" : fill[state(midi)])}
            strokeWidth="0.15"
          />
        ))}
        {Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i)
          .filter((midi) => !isWhite(midi))
          .map((midi) => {
            const leftWhite = whites.indexOf(midi - 1);
            return (
              <rect
                key={midi}
                x={(leftWhite + 1) * KEY_WIDTH - KEY_WIDTH * 0.3}
                y={0}
                width={KEY_WIDTH * 0.6}
                height={16}
                className={state(midi) === "off" ? "fill-neutral-800" : fill[state(midi)]}
              />
            );
          })}
      </svg>

      <ul className="flex flex-wrap gap-4 text-xs text-text-secondary">
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-warning" aria-hidden /> Bass: the root, the note the chord is named after
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-accent" aria-hidden /> Keys: the notes on top that give the color
        </li>
      </ul>
    </div>
  );
}
