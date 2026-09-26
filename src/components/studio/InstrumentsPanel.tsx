import { AudioLines, Drum, Guitar, Piano, Waves, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { BASS_VOICE_USES_WAVE, KEYS_VOICE_USES_WAVE, type Waveform } from "@/audio";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RANGES } from "@/songs/ranges";
import { useStudio } from "@/state/studio";
import { AdsrEditor } from "./AdsrEditor";
import { BASS_VOICE_OPTIONS, DRUM_KIT_OPTIONS, KEYS_VOICE_OPTIONS, LEAD_VOICE_OPTIONS, PAD_VOICE_OPTIONS } from "./instrument-labels";

const WAVES: { value: Waveform; label: string }[] = [
  { value: "sine", label: "Sine" },
  { value: "triangle", label: "Tri" },
  { value: "square", label: "Square" },
  { value: "sawtooth", label: "Saw" },
];

const percent = (v: number) => `${Math.round(v * 100)}%`;
const hertz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);
const seconds = (v: number) => `${v.toFixed(2)} s`;

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-text-muted">{children}</p>;
}

function KeysControls() {
  const keys = useStudio((s) => s.params.keys);
  const setSection = useStudio((s) => s.setSection);
  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Segmented label="Voice" value={keys.voice} options={KEYS_VOICE_OPTIONS} onChange={(voice) => setSection("keys", { voice })} />
        <Slider label="Level" {...RANGES.level} value={keys.level} format={percent} onChange={(level) => setSection("keys", { level })} />
        {KEYS_VOICE_USES_WAVE[keys.voice] && <Segmented label="Waveform" value={keys.wave} options={WAVES} onChange={(wave) => setSection("keys", { wave })} />}
        <Slider label="Low-pass cutoff" {...RANGES.keysCutoff} value={keys.cutoff} format={hertz} onChange={(cutoff) => setSection("keys", { cutoff })} />
        <Slider
          label="LFO wobble rate"
          {...RANGES.lfoRate}
          value={keys.lfoRate}
          format={(v) => `${v.toFixed(2)} Hz`}
          onChange={(lfoRate) => setSection("keys", { lfoRate })}
        />
        <Slider
          label="LFO wobble depth"
          {...RANGES.lfoDepth}
          value={keys.lfoDepth}
          format={percent}
          onChange={(lfoDepth) => setSection("keys", { lfoDepth })}
        />
      </div>
      <AdsrEditor value={keys.adsr} onChange={(patch) => setSection("keys", { adsr: { ...keys.adsr, ...patch } })} />
    </div>
  );
}

function BassControls() {
  const bass = useStudio((s) => s.params.bass);
  const setSection = useStudio((s) => s.setSection);
  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Segmented label="Voice" value={bass.voice} options={BASS_VOICE_OPTIONS} onChange={(voice) => setSection("bass", { voice })} />
        <Slider label="Level" {...RANGES.level} value={bass.level} format={percent} onChange={(level) => setSection("bass", { level })} />
        {BASS_VOICE_USES_WAVE[bass.voice] && <Segmented label="Waveform" value={bass.wave} options={WAVES} onChange={(wave) => setSection("bass", { wave })} />}
        <Slider label="Low-pass cutoff" {...RANGES.bassCutoff} value={bass.cutoff} format={hertz} onChange={(cutoff) => setSection("bass", { cutoff })} />
      </div>
      <AdsrEditor value={bass.adsr} onChange={(patch) => setSection("bass", { adsr: { ...bass.adsr, ...patch } })} />
    </div>
  );
}

function DrumsControls() {
  const drums = useStudio((s) => s.params.drums);
  const setSection = useStudio((s) => s.setSection);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Segmented label="Kit" value={drums.kit} options={DRUM_KIT_OPTIONS} onChange={(kit) => setSection("drums", { kit })} />
      <Slider label="Kick" {...RANGES.level} value={drums.kick} format={percent} onChange={(kick) => setSection("drums", { kick })} />
      <Slider label="Snare" {...RANGES.level} value={drums.snare} format={percent} onChange={(snare) => setSection("drums", { snare })} />
      <Slider label="Hi-hat" {...RANGES.level} value={drums.hat} format={percent} onChange={(hat) => setSection("drums", { hat })} />
    </div>
  );
}

function PadControls() {
  const pad = useStudio((s) => s.params.pad);
  const setSection = useStudio((s) => s.setSection);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Hint>Long chords that swell in under the keys, one per bar. Turn the level up to hear it.</Hint>
      <Segmented label="Voice" value={pad.voice} options={PAD_VOICE_OPTIONS} onChange={(voice) => setSection("pad", { voice })} />
      <Slider
        label="Level"
        {...RANGES.level}
        value={pad.level}
        format={(v) => (v === 0 ? "Off" : percent(v))}
        onChange={(level) => setSection("pad", { level })}
      />
      <Slider label="Fade in" {...RANGES.padAttack} value={pad.attack} format={seconds} onChange={(attack) => setSection("pad", { attack })} />
      <Slider label="Brightness" {...RANGES.padCutoff} value={pad.cutoff} format={hertz} onChange={(cutoff) => setSection("pad", { cutoff })} />
    </div>
  );
}

function LeadControls() {
  const lead = useStudio((s) => s.params.lead);
  const setSection = useStudio((s) => s.setSection);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Hint>A melody on the notes of each chord. Place its notes on the Melody row of the sequencer.</Hint>
      <Segmented label="Voice" value={lead.voice} options={LEAD_VOICE_OPTIONS} onChange={(voice) => setSection("lead", { voice })} />
      <Slider
        label="Level"
        {...RANGES.level}
        value={lead.level}
        format={(v) => (v === 0 ? "Off" : percent(v))}
        onChange={(level) => setSection("lead", { level })}
      />
      <Slider label="Echo" {...RANGES.amount} value={lead.echo} format={percent} onChange={(echo) => setSection("lead", { echo })} />
    </div>
  );
}

/** A tab label with a dot that shows whether the instrument is audible. */
function Tab({ value, icon, label, on }: { value: string; icon: ReactNode; label: string; on: boolean }) {
  return (
    <TabsTrigger value={value} className="flex-none gap-1.5 px-2.5 sm:flex-1 sm:gap-2 sm:px-3">
      {icon}
      {label}
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-pill", on ? "bg-success" : "bg-border")} />
      <span className="sr-only">{on ? "(on)" : "(off)"}</span>
    </TabsTrigger>
  );
}

export function InstrumentsPanel() {
  const open = useStudio((s) => s.panels.instruments);
  const setPanel = useStudio((s) => s.setPanel);
  const keysOn = useStudio((s) => s.params.keys.level > 0);
  const bassOn = useStudio((s) => s.params.bass.level > 0);
  const drumsOn = useStudio((s) => s.params.drums.kick + s.params.drums.snare + s.params.drums.hat > 0);
  const padOn = useStudio((s) => s.params.pad.level > 0);
  const leadOn = useStudio((s) => s.params.lead.level > 0);
  return (
    <Panel
      title="Instruments"
      description="Five instruments, each with its own voices: keys, bass, drums, pad and melody"
      icon={<AudioLines className="h-4 w-4" />}
      open={open}
      onOpenChange={(o) => setPanel("instruments", o)}
    >
      <Tabs defaultValue="keys" className="flex flex-col gap-4">
        <TabsList aria-label="Instrument" className="flex w-full overflow-x-auto">
          <Tab value="keys" icon={<Piano className="hidden h-4 w-4 sm:block" aria-hidden />} label="Keys" on={keysOn} />
          <Tab value="bass" icon={<Guitar className="hidden h-4 w-4 sm:block" aria-hidden />} label="Bass" on={bassOn} />
          <Tab value="drums" icon={<Drum className="hidden h-4 w-4 sm:block" aria-hidden />} label="Drums" on={drumsOn} />
          <Tab value="pad" icon={<Waves className="hidden h-4 w-4 sm:block" aria-hidden />} label="Pad" on={padOn} />
          <Tab value="lead" icon={<Wind className="hidden h-4 w-4 sm:block" aria-hidden />} label="Melody" on={leadOn} />
        </TabsList>
        <TabsContent value="keys" className="outline-none">
          <KeysControls />
        </TabsContent>
        <TabsContent value="bass" className="outline-none">
          <BassControls />
        </TabsContent>
        <TabsContent value="drums" className="outline-none">
          <DrumsControls />
        </TabsContent>
        <TabsContent value="pad" className="outline-none">
          <PadControls />
        </TabsContent>
        <TabsContent value="lead" className="outline-none">
          <LeadControls />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
