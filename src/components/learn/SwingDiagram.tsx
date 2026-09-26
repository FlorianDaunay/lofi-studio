import { cn } from "@/lib/utils";
import { useStudio } from "@/state/studio";

const STEPS = 16;
const WIDTH = 480;
const SPACING = WIDTH / STEPS;

/**
 * One bar as 16 dots. On a straight beat they are evenly spaced; swing pushes every second dot
 * later, toward the next one. Drawn for illustration, not to scale with the audio.
 */
export function SwingDiagram() {
  const swing = useStudio((s) => s.params.swing);
  const step = useStudio((s) => s.step);

  return (
    <svg viewBox={`0 0 ${WIDTH} 64`} role="img" aria-label={`One bar of sixteen notes at ${Math.round(swing * 100)} percent swing`} className="w-full">
      <line x1="0" y1="32" x2={WIDTH} y2="32" className="stroke-border" strokeWidth="1" />
      {Array.from({ length: STEPS }, (_, i) => {
        const offBeat = i % 2 === 1;
        const x = SPACING * (i + 0.5) + (offBeat ? swing * SPACING * 0.45 : 0);
        const strong = i % 4 === 0;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={32}
              r={strong ? 8 : offBeat ? 4.5 : 6}
              className={cn("transition-all duration-150", step === i ? "fill-accent-hover" : offBeat ? "fill-text-muted" : "fill-accent")}
            />
            {strong && (
              <text x={SPACING * (i + 0.5)} y="10" textAnchor="middle" className="fill-text-muted text-[11px]">
                {i / 4 + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
