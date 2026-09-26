import { lfoFloor } from "@/audio";
import { useStudio } from "@/state/studio";

const WIDTH = 480;
const HEIGHT = 120;
const PAD = 14;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The keys' filter cutoff over time: the LFO moves it up and down between a floor and the cutoff
 * you set. The dot runs at the LFO speed; the height of the wave is the depth.
 */
export function LfoScope() {
  const { cutoff, lfoRate, lfoDepth } = useStudio((s) => s.params.keys);
  const floor = lfoFloor(cutoff, lfoDepth);

  // The wave is drawn from the top (cutoff) down to the floor, on a log scale like our ears.
  const octaves = Math.log2(cutoff / 90);
  const drop = octaves > 0 ? Math.min(1, Math.log2(cutoff / floor) / octaves) : 0;
  const top = PAD;
  const bottom = PAD + (HEIGHT - 2 * PAD) * Math.max(drop, 0.02);
  const mid = (top + bottom) / 2;
  const amp = (bottom - top) / 2;

  const cycles = 2;
  const points = Array.from({ length: 121 }, (_, i) => {
    const x = (i / 120) * WIDTH;
    const y = mid - amp * Math.sin((i / 120) * cycles * 2 * Math.PI + Math.PI / 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Filter cutoff sweeping between ${Math.round(floor)} and ${Math.round(cutoff)} hertz, ${lfoRate} times per second`} className="w-full rounded-control border bg-canvas">
        <line x1="0" x2={WIDTH} y1={top} y2={top} className="stroke-border" strokeDasharray="4 4" />
        <line x1="0" x2={WIDTH} y1={bottom} y2={bottom} className="stroke-border" strokeDasharray="4 4" />
        <path d={points} fill="none" className="stroke-accent" strokeWidth="2" />
        <circle r="6" className="fill-warning">
          {!reducedMotion() && (
            <animateMotion key={`${lfoRate}-${lfoDepth}-${cutoff}`} dur={`${(cycles / lfoRate).toFixed(2)}s`} repeatCount="indefinite" path={points} />
          )}
        </circle>
        <text x={WIDTH - 6} y={top - 3} textAnchor="end" className="fill-text-muted text-[10px]">
          {Math.round(cutoff)} Hz: brightest
        </text>
        <text x={WIDTH - 6} y={bottom + 12} textAnchor="end" className="fill-text-muted text-[10px]">
          {Math.round(floor)} Hz: most muffled
        </text>
      </svg>
      <figcaption className="text-xs text-text-muted">
        Each pass through the wave takes {(1 / lfoRate).toFixed(1)} s. The dot shows where the filter is right now.
      </figcaption>
    </figure>
  );
}
