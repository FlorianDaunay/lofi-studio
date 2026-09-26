import { AudioLines, Grid3x3, Music, Sparkles } from "lucide-react";
import type { Waveform } from "@/audio";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { AdsrEditor } from "./AdsrEditor";
import { ChordEditor } from "./ChordEditor";
import { StepGrid } from "./StepGrid";

const WAVES: { value: Waveform; label: string }[] = [
  { value: "sine", label: "Sine" },
  { value: "triangle", label: "Tri" },
  { value: "square", label: "Square" },
  { value: "sawtooth", label: "Saw" },
];

const percent = (v: number) => `${Math.round(v * 100)}%`;
const hertz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);

function SubTitle({ children }: { children: string }) {
  return <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">{children}</h3>;
}

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

function InstrumentsPanel() {
  const open = useStudio((s) => s.panels.instruments);
  const setPanel = useStudio((s) => s.setPanel);
  const keys = useStudio((s) => s.params.keys);
  const bass = useStudio((s) => s.params.bass);
  const drums = useStudio((s) => s.params.drums);
  const setSection = useStudio((s) => s.setSection);
  return (
    <Panel
      title="Instruments"
      description="Waveforms, ADSR envelopes, filter and LFO wobble"
      icon={<AudioLines className="h-4 w-4" />}
      open={open}
      onOpenChange={(o) => setPanel("instruments", o)}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <SubTitle>Keys</SubTitle>
          <Slider label="Level" {...RANGES.level} value={keys.level} format={percent} onChange={(level) => setSection("keys", { level })} />
          <Segmented label="Waveform" value={keys.wave} options={WAVES} onChange={(wave) => setSection("keys", { wave })} />
          <AdsrEditor value={keys.adsr} onChange={(patch) => setSection("keys", { adsr: { ...keys.adsr, ...patch } })} />
          <Slider label="Low-pass cutoff" {...RANGES.keysCutoff} value={keys.cutoff} format={hertz} onChange={(cutoff) => setSection("keys", { cutoff })} />
          <Slider label="LFO wobble rate" {...RANGES.lfoRate} value={keys.lfoRate} format={(v) => `${v.toFixed(2)} Hz`} onChange={(lfoRate) => setSection("keys", { lfoRate })} />
          <Slider label="LFO wobble depth" {...RANGES.lfoDepth} value={keys.lfoDepth} format={percent} onChange={(lfoDepth) => setSection("keys", { lfoDepth })} />
        </div>

        <div className="flex flex-col gap-3">
          <SubTitle>Bass</SubTitle>
          <Slider label="Level" {...RANGES.level} value={bass.level} format={percent} onChange={(level) => setSection("bass", { level })} />
          <Segmented label="Waveform" value={bass.wave} options={WAVES} onChange={(wave) => setSection("bass", { wave })} />
          <AdsrEditor value={bass.adsr} onChange={(patch) => setSection("bass", { adsr: { ...bass.adsr, ...patch } })} />
          <Slider label="Low-pass cutoff" {...RANGES.bassCutoff} value={bass.cutoff} format={hertz} onChange={(cutoff) => setSection("bass", { cutoff })} />
        </div>

        <div className="flex flex-col gap-3">
          <SubTitle>Drums</SubTitle>
          <Slider label="Kick" {...RANGES.level} value={drums.kick} format={percent} onChange={(kick) => setSection("drums", { kick })} />
          <Slider label="Snare" {...RANGES.level} value={drums.snare} format={percent} onChange={(snare) => setSection("drums", { snare })} />
          <Slider label="Hi-hat" {...RANGES.level} value={drums.hat} format={percent} onChange={(hat) => setSection("drums", { hat })} />
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
