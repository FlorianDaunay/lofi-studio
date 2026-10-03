import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChordEditor } from "@/components/studio/ChordEditor";
import { RandomizeMenu } from "@/components/studio/RandomizeMenu";
import { StepGrid } from "@/components/studio/StepGrid";
import { STEPS } from "@/audio";
import { cn } from "@/lib/utils";
import { steps } from "@/songs/params";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { ChordKeyboard } from "../ChordKeyboard";
import { P, PlayChip, Term, Tip, Try } from "../parts";
import { SwingDiagram } from "../SwingDiagram";

const percent = (v: number) => `${Math.round(v * 100)}%`;

export function TempoSwing() {
  const { bpm, swing, humanize } = useStudio((s) => s.params);
  const setGlobal = useStudio((s) => s.setGlobal);
  return (
    <>
      <P>
        <Term>Tempo</Term> is measured in beats per minute (BPM). Lo-fi lives between about 70 and 85: slow enough to feel relaxed, fast enough to nod to.
      </P>
      <P>
        <Term>Swing</Term> delays every second note a little, so the beat lilts instead of marching. <Term>Humanize</Term> adds tiny random changes to
        timing and loudness, the way a real player is never exactly on the grid.
      </P>
      <Try title="Feel the lilt">
        <PlayChip />
        <SwingDiagram />
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
          <Slider label="Tempo" {...RANGES.bpm} value={bpm} format={(v) => `${v} BPM`} onChange={(v) => setGlobal({ bpm: v })} />
          <Slider label="Swing" {...RANGES.swing} value={swing} format={percent} onChange={(v) => setGlobal({ swing: v })} />
          <Slider label="Humanize" {...RANGES.humanize} value={humanize} format={percent} onChange={(v) => setGlobal({ humanize: v })} />
        </div>
      </Try>
      <Tip>The dot that lights up in the diagram is the note playing right now. Push swing to the maximum and watch the small dots slide away from the big ones.</Tip>
    </>
  );
}

const EXAMPLES = [
  {
    name: "Boom bap",
    text: "The classic",
    pattern: { kick: "x......x..x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x......x.....", keys: "x......x..x....." },
  },
  {
    name: "Half-time",
    text: "Slow and heavy",
    pattern: { kick: "x.......x.x.....", snare: "........x.......", hat: "x.x.x.x.x.x.x.x.", bass: "x.......x.......", keys: "x.......x......." },
  },
  {
    name: "Sparse",
    text: "Room to breathe",
    pattern: { kick: "x.......x.......", snare: "....x.......x...", hat: "x...x...x...x...", bass: "x...............", keys: "x..............." },
  },
] as const;

/** Beat numbers above the grid, lined up with the 16 columns. */
function BeatRuler() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="w-14 shrink-0" />
      <div className="flex flex-1 gap-1">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={cn("min-w-0 flex-1 text-center text-[10px] text-text-muted", i % 4 === 0 && "ml-1.5 font-semibold text-text-secondary first:ml-0")}>
            {i % 4 === 0 ? i / 4 + 1 : "·"}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Groove() {
  const setPattern = useStudio((s) => s.setPattern);
  return (
    <>
      <P>
        One bar is split into <Term>16 steps</Term>. Four steps make a beat, so the numbers 1 to 4 below mark the beats, and the dots between are the
        in-between notes. Click a square to make that instrument play on that step.
      </P>
      <P>
        Most hip-hop grooves share a backbone: the <Term>kick</Term> lands on beat 1, the <Term>snare</Term> on beats 2 and 4, and the{" "}
        <Term>hi-hat</Term> keeps time. Everything else is decoration.
      </P>
      <Try title="Draw it yourself">
        <PlayChip />
        <div className="flex flex-col gap-1.5">
          <BeatRuler />
          <StepGrid />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-text-secondary">Start from</span>
          {EXAMPLES.map((example) => (
            <Button
              key={example.name}
              size="sm"
              title={example.text}
              onClick={() =>
                setPattern({
                  kick: steps(example.pattern.kick),
                  snare: steps(example.pattern.snare),
                  hat: steps(example.pattern.hat),
                  bass: steps(example.pattern.bass),
                  keys: steps(example.pattern.keys),
                  // The examples are drum-and-chord grooves: the percussion and melody rows are left as they are.
                  perc: useStudio.getState().params.pattern.perc,
                  lead: useStudio.getState().params.pattern.lead,
                })
              }
            >
              {example.name}
            </Button>
          ))}
        </div>
      </Try>
      <Tip>Try removing the kick from beat 1 and listen for what feels missing. That empty spot is what your ear expects to be filled.</Tip>
    </>
  );
}

export function Chords() {
  return (
    <>
      <P>
        A <Term>chord</Term> is several notes played together. A <Term>progression</Term> is a chain of chords, here one per bar, looping forever. The
        color of each chord comes from its type: <Term>major 7</Term> feels warm, <Term>minor 9</Term> feels dreamy, <Term>dominant 13</Term> feels
        like a jazz bar.
      </P>
      <Try title="Edit the chords">
        <PlayChip />
        <ChordEditor />
      </Try>
      <P>Below, the piano shows which notes the chosen bar plays. When the music runs, it follows the bar that is playing.</P>
      <ChordKeyboard />
      <Tip>
        A <Term>dominant</Term> chord (7, 9 or 13) in the last bar creates tension that resolves when the loop starts again. It is the trick behind most
        jazzy loops.
      </Tip>
    </>
  );
}

const MATRIX = [
  { name: "New groove", touches: [true, false, false, false] },
  { name: "New chords", touches: [false, true, false, false] },
  { name: "New sound", touches: [false, false, true, false] },
  { name: "Surprise me", touches: [true, true, true, true] },
] as const;
const COLUMNS = ["Rhythm", "Chords", "Sound & ambience", "Tempo & swing"] as const;

export function Randomize() {
  const canUndo = useStudio((s) => s.history.length > 0);
  return (
    <>
      <P>
        When you run out of ideas, let the app suggest some. It only picks from choices that sound good together: chords come from a list of jazzy
        progressions, and the sound stays inside warm ranges. Your volume and instrument levels are never touched.
      </P>
      <div className="overflow-x-auto rounded-card border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-hover/60 text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Option</th>
              {COLUMNS.map((c) => (
                <th key={c} className="px-3 py-2 text-center font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map(({ name, touches }) => (
              <tr key={name} className="border-t">
                <th scope="row" className="px-3 py-2 font-medium">
                  {name}
                </th>
                {touches.map((on, i) => (
                  <td key={i} className="px-3 py-2 text-center">
                    {on ? <Check className="mx-auto h-4 w-4 text-accent" aria-label="changes" /> : <span className="text-text-muted" aria-label="unchanged">·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Try title="Roll the dice">
        <PlayChip />
        <div className="flex flex-wrap items-center gap-3">
          <RandomizeMenu />
          <span className="text-xs text-text-muted">{canUndo ? "You can undo. Open the menu and choose Undo." : "Nothing to undo yet."}</span>
        </div>
      </Try>
      <Tip>The menu remembers your last five changes. Found something great by accident? Save it before rolling again.</Tip>
    </>
  );
}
