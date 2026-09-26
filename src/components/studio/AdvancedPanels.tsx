import { Grid3x3, Music, Sparkles } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { ChordEditor } from "./ChordEditor";
import { InstrumentsPanel } from "./InstrumentsPanel";
import { StepGrid } from "./StepGrid";

const percent = (v: number) => `${Math.round(v * 100)}%`;
const hertz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);

function SequencerPanel() {
  const open = useStudio((s) => s.panels.sequencer);
  const setPanel = useStudio((s) => s.setPanel);
  const swing = useStudio((s) => s.params.swing);
  const bpm = useStudio((s) => s.params.bpm);
  const humanize = useStudio((s) => s.params.humanize);
  const setGlobal = useStudio((s) => s.setGlobal);
  return (
    <Panel
      title="Sequencer"
      description="16-step grid, tempo, swing and humanize"
      icon={<Grid3x3 className="h-4 w-4" />}
      open={open}
      onOpenChange={(o) => setPanel("sequencer", o)}
    >
      <div className="flex flex-col gap-5">
        <StepGrid />
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
          <Slider label="Tempo" {...RANGES.bpm} value={bpm} format={(v) => `${v} BPM`} onChange={(v) => setGlobal({ bpm: v })} />
          <Slider label="Swing" {...RANGES.swing} value={swing} format={percent} onChange={(v) => setGlobal({ swing: v })} />
          <Slider label="Humanize" {...RANGES.humanize} value={humanize} format={percent} onChange={(v) => setGlobal({ humanize: v })} />
        </div>
      </div>
    </Panel>
  );
}

/** The four lo-fi sliders. Shared by the Effects panel and the tutorial. */
export function EffectsControls() {
  const fx = useStudio((s) => s.params.fx);
  const setSection = useStudio((s) => s.setSection);
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      <Slider label="Master low-pass" {...RANGES.tone} value={fx.tone} format={hertz} onChange={(tone) => setSection("fx", { tone })} />
      <Slider label="Tape wobble" {...RANGES.amount} value={fx.wobble} format={percent} onChange={(wobble) => setSection("fx", { wobble })} />
      <Slider label="Warmth (saturation)" {...RANGES.amount} value={fx.warmth} format={percent} onChange={(warmth) => setSection("fx", { warmth })} />
      <Slider label="Reverb" {...RANGES.amount} value={fx.reverb} format={percent} onChange={(reverb) => setSection("fx", { reverb })} />
    </div>
  );
}

function EffectsPanel() {
  const open = useStudio((s) => s.panels.effects);
  const setPanel = useStudio((s) => s.setPanel);
  return (
    <Panel
      title="Lo-fi effects"
      description="Muffled tone, tape wobble, warmth, reverb"
      icon={<Sparkles className="h-4 w-4" />}
      open={open}
      onOpenChange={(o) => setPanel("effects", o)}
    >
      <EffectsControls />
    </Panel>
  );
}

function ChordsPanel() {
  const open = useStudio((s) => s.panels.chords);
  const setPanel = useStudio((s) => s.setPanel);
  return (
    <Panel
      title="Chords"
      description="One chord per bar, up to eight bars"
      icon={<Music className="h-4 w-4" />}
      open={open}
      onOpenChange={(o) => setPanel("chords", o)}
    >
      <ChordEditor />
    </Panel>
  );
}

export function AdvancedPanels() {
  return (
    <section aria-label="Advanced settings" className="flex flex-col gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">Advanced</h2>
      <SequencerPanel />
      <ChordsPanel />
      <InstrumentsPanel />
      <EffectsPanel />
    </section>
  );
}
