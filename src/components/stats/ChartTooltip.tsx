import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartTooltipProps {
  /** Position of the anchor inside the (relative) chart container, in px. */
  x: number;
  y: number;
  /** The container width, to keep the tooltip inside it. */
  width: number;
  /** The value: the strong part. */
  value: ReactNode;
  /** What the value is about: the secondary part. */
  label: ReactNode;
}

/** The hover readout of a chart: value first, then what it is. Never the only way to read a value. */
export function ChartTooltip({ x, y, width, value, label }: ChartTooltipProps) {
  // Flip to the left of the anchor past the middle, so it never leaves the card.
  const right = x > width / 2;
  return (
    <div
      role="presentation"
      className={cn(
        "pointer-events-none absolute z-10 whitespace-nowrap rounded-control border bg-surface px-2.5 py-1.5 text-xs shadow-overlay",
        right ? "-translate-x-full" : "",
      )}
      style={{ left: right ? x - 10 : x + 10, top: Math.max(0, y - 16) }}
    >
      <div className="font-semibold text-text-primary">{value}</div>
      <div className="text-text-muted">{label}</div>
    </div>
  );
}
