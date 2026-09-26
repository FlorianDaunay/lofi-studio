import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AdsrEditor } from "@/components/studio/AdsrEditor";
import { EffectsControls } from "@/components/studio/AdvancedPanels";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { LfoScope } from "../LfoScope";
import { P, PlayChip, Term, Tip, Try } from "../parts";

const hertz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);

const PARTS = [
  ["Attack", "how long the note takes to reach full volume after you hit it"],
  ["Decay", "how long it takes to fall from that peak to the resting level"],
  ["Sustain", "the resting level while the note is held"],
  ["Release", "how long the sound lingers after the note ends"],
] as const;

const SHAPES = [
  { name: "Pluck", text: "Instant, then gone", adsr: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.4 } },
  { name: "Electric piano", text: "The default", adsr: { attack: 0.01, decay: 1.2, sustain: 0.25, release: 1.2 } },
  { name: "Soft pad", text: "Fades in, glows", adsr: { attack: 0.4, decay: 1, sustain: 0.7, release: 2 } },
  { name: "Organ", text: "On and off", adsr: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.1 } },
] as const;

export function Adsr() {
  const adsr = useStudio((s) => s.params.keys.adsr);
  const setSection = useStudio((s) => s.setSection);
  return (
    <>
      <P>
        A real instrument does not just switch on and off. Its volume follows a shape over time, and four numbers describe that shape:
      </P>
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {PARTS.map(([name, text]) => (
          <div key={name}>
            <dt className="inline font-semibold">{name}: </dt>
            <dd className="inline text-text-secondary">{text}.</dd>
          </div>
        ))}
      </dl>
      <Try title="Sculpt the piano">
        <PlayChip />
        <AdsrEditor value={adsr} onChange={(patch) => setSection("keys", { adsr: { ...adsr, ...patch } })} />
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-text-secondary">Start from</span>
          {SHAPES.map((shape) => (
            <Button key={shape.name} size="sm" title={shape.text} onClick={() => setSection("keys", { adsr: shape.adsr })}>
              {shape.name}
            </Button>
          ))}
        </div>
      </Try>
      <Tip>
        This shapes the <Term>keys</Term>. The bass has its own envelope in the Instruments panel on the Studio page: a longer release there makes it
        sound rounder, a short one punchier.
      </Tip>
    </>
  );
}

export function FilterLfo() {
  const { cutoff, lfoRate, lfoDepth } = useStudio((s) => s.params.keys);
  const setSection = useStudio((s) => s.setSection);
  return (
    <>
      <P>
        A <Term>low-pass filter</Term> lets the low notes through and muffles the high ones. Lower the cutoff and the piano goes from sparkly to
        underwater.
      </P>
      <P>
        An <Term>LFO</Term> (low-frequency oscillator) is a knob that turns by itself, slowly, in a smooth wave. Here it moves the cutoff up and down,
        which makes the keys breathe. That is the wobble.
      </P>
      <Try title="Move the filter">
        <PlayChip />
        <LfoScope />
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
          <Slider label="Cutoff (top of the wave)" {...RANGES.keysCutoff} value={cutoff} format={hertz} onChange={(v) => setSection("keys", { cutoff: v })} />
          <Slider label="Wobble speed" {...RANGES.lfoRate} value={lfoRate} format={(v) => `${v.toFixed(2)} Hz`} onChange={(v) => setSection("keys", { lfoRate: v })} />
          <Slider label="Wobble depth" {...RANGES.lfoDepth} value={lfoDepth} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setSection("keys", { lfoDepth: v })} />
        </div>
      </Try>
      <Tip>At zero depth the filter stays still and the wobble disappears. Slow speeds (under 0.3 Hz) feel like breathing; fast ones feel like a warble.</Tip>
    </>
  );
}

const EFFECTS = [
  ["Master low-pass", "muffles everything, like a small old speaker"],
  ["Tape wobble", "the pitch drifts a little, like a worn cassette"],
  ["Warmth", "soft distortion that fattens and rounds the sound"],
  ["Reverb", "a short echo that adds a sense of room"],
] as const;

export function LofiFx() {
  const setSection = useStudio((s) => s.setSection);
  return (
    <>
      <P>Lo-fi is clean sound made imperfect on purpose. Four effects do the work:</P>
      <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {EFFECTS.map(([name, text]) => (
          <li key={name}>
            <span className="font-semibold">{name}: </span>
            <span className="text-text-secondary">{text}.</span>
          </li>
        ))}
      </ul>
      <Try title="Clean or lo-fi?">
        <PlayChip />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setSection("fx", { tone: 12000, wobble: 0, warmth: 0, reverb: 0 })}>
            Make it clean
          </Button>
          <Button size="sm" variant="primary" onClick={() => setSection("fx", { tone: 3800, wobble: 0.45, warmth: 0.45, reverb: 0.25 })}>
            Make it lo-fi
          </Button>
          <span className="text-xs text-text-muted">Switch while it plays and listen to the difference.</span>
        </div>
        <EffectsControls />
      </Try>
      <Tip>A very low master low-pass hides the hi-hats, and a lot of warmth can make the drums crunchy. Move one slider at a time.</Tip>
    </>
  );
}
