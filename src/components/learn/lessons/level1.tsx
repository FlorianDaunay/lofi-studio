import { CloudRain, Disc3, Wind } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Ambience } from "@/components/studio/Ambience";
import { PinnedSongs } from "@/components/studio/PinnedSongs";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { P, PlayChip, Term, Tip, Try } from "../parts";
import { SignalFlow } from "../SignalFlow";

export function FirstLoop() {
  const volume = useStudio((s) => s.params.volume);
  const setGlobal = useStudio((s) => s.setGlobal);
  return (
    <>
      <P>
        Lofi Studio contains <Term>no recordings</Term>. Every sound is calculated live: a small synthesizer plays the piano, the bass and the drums, and
        noise generators make the rain and the vinyl crackle. That is why the app is tiny, and why every knob changes the sound instantly.
      </P>
      <Try title="Press play">
        <PlayChip />
        <Slider label="Volume" {...RANGES.volume} value={volume} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setGlobal({ volume: v })} />
      </Try>
      <P>Here is the road the sound travels, from the instruments to your speakers. Click a stage to see what it does.</P>
      <SignalFlow />
      <Tip>
        The <Term>Play</Term> button also lives in the player bar (the sidebar on a computer, the bottom of the screen on a phone), so you can start and stop
        from any page.
      </Tip>
    </>
  );
}

const CONTENTS = [
  ["Tempo", "how fast, in beats per minute"],
  ["Chords", "the harmony, one chord per bar"],
  ["Rhythm", "which drum, bass and piano steps play"],
  ["Sound", "the tone of the piano and the effects"],
  ["Atmosphere", "the rain, vinyl and wind levels"],
] as const;

export function PickAMood() {
  return (
    <>
      <P>
        A <Term>song</Term> is a complete setup that you can load with one click. It remembers five things:
      </P>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {CONTENTS.map(([name, text]) => (
          <div key={name} className="flex gap-2">
            <dt className="font-medium">{name}</dt>
            <dd className="text-text-muted">{text}</dd>
          </div>
        ))}
      </dl>
      <Try title="Load a pinned song">
        <PlayChip />
        <PinnedSongs />
      </Try>
      <Tip>
        The small <Term>⇄</Term> button on a card changes which song sits in that slot. There are twelve songs built in, and yours join them in the Library.
      </Tip>
    </>
  );
}

const RECIPES = [
  { icon: CloudRain, name: "Rain", text: "Pink noise (a soft hiss) with the highs and lows filtered out, plus thousands of tiny random drops." },
  { icon: Disc3, name: "Vinyl", text: "A few random clicks and pops per second over a faint hiss, and a very low rumble like a turntable." },
  { icon: Wind, name: "Wind", text: "Brown noise (a deep rumble) through a filter whose pitch and volume drift slowly by themselves." },
] as const;

export function Atmosphere() {
  return (
    <>
      <P>
        The ambience layers are made of <Term>noise</Term>, random sound that you shape with filters. Nothing loops audibly, because the randomness never
        repeats the same way twice.
      </P>
      <ul className="grid gap-3 sm:grid-cols-3">
        {RECIPES.map(({ icon: Icon, name, text }) => (
          <li key={name} className="rounded-card border bg-canvas p-3">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 text-accent" aria-hidden />
              {name}
            </p>
            <p className="text-xs text-text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <Try title="Mix your weather">
        <PlayChip />
        <Ambience />
      </Try>
      <Tip>Layers only use processing power while they are audible, so leaving one at zero costs nothing.</Tip>
    </>
  );
}
