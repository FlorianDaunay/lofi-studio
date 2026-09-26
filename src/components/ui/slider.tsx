import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Text shown next to the label, e.g. `(v) => \`${v} BPM\``. Defaults to the raw number. */
  format?: (value: number) => string;
  /** Hide the label row (the label stays as the accessible name). */
  compact?: boolean;
  className?: string;
}

export function Slider({ label, value, onChange, min, max, step, format, compact, className }: SliderProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {!compact && (
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-text-secondary">
            {label}
          </span>
          <output className="font-mono text-text-muted" aria-hidden>
            {format ? format(value) : value}
          </output>
        </div>
      )}
      <SliderPrimitive.Root
        className="relative flex h-5 w-full touch-none select-none items-center [@media(pointer:coarse)]:h-8"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => v !== undefined && onChange(v)}
      >
        <SliderPrimitive.Track className="relative h-1.5 grow rounded-pill bg-surface-hover">
          <SliderPrimitive.Range className="absolute h-full rounded-pill bg-accent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          aria-valuetext={format ? format(value) : undefined}
          className="block h-4 w-4 rounded-pill border bg-accent shadow-control transition-transform hover:scale-110 [@media(pointer:coarse)]:h-6 [@media(pointer:coarse)]:w-6"
        />
      </SliderPrimitive.Root>
    </div>
  );
}
