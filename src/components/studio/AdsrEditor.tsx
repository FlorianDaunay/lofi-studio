import type { Adsr } from "@/audio";
import { Slider } from "@/components/ui/slider";
import { RANGES } from "@/songs/ranges";

const seconds = (v: number) => `${v.toFixed(2)} s`;

/** The envelope drawn as a shape: attack up, decay down to the sustain level, then release. */
function EnvelopeShape({ attack, decay, sustain, release }: Adsr) {
  const width = 160;
  const height = 48;
  // Each stage gets a share of the width proportional to its time (with a floor so it stays visible),
  // and the sustain stage is a fixed slice.
  const stages = [attack, decay, 0, release].map((t, i) => (i === 2 ? 0.4 : Math.max(t, 0.05)));
  const total = stages.reduce((a, b) => a + b, 0);
  const x = (n: number) => (stages.slice(0, n).reduce((a, b) => a + b, 0) / total) * width;
  const yLevel = height - sustain * (height - 4) - 2;
  const points = [
    [0, height - 2],
    [x(1), 2],
    [x(2), yLevel],
    [x(3), yLevel],
    [x(4), height - 2],
  ];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full max-w-40 text-accent" role="img" aria-label="Envelope shape">
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface AdsrEditorProps {
  value: Adsr;
  onChange: (patch: Partial<Adsr>) => void;
}

export function AdsrEditor({ value, onChange }: AdsrEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <EnvelopeShape {...value} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Slider label="Attack" {...RANGES.attack} value={value.attack} format={seconds} onChange={(attack) => onChange({ attack })} />
        <Slider label="Decay" {...RANGES.decay} value={value.decay} format={seconds} onChange={(decay) => onChange({ decay })} />
        <Slider
          label="Sustain"
          {...RANGES.sustain}
          value={value.sustain}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(sustain) => onChange({ sustain })}
        />
        <Slider label="Release" {...RANGES.release} value={value.release} format={seconds} onChange={(release) => onChange({ release })} />
      </div>
    </div>
  );
}
