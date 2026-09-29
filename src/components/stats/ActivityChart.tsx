import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { Segmented } from "@/components/ui/segmented";
import type { DayPoint } from "@/songs/insights";
import { ChartTooltip } from "./ChartTooltip";
import { formatValue, longDay, niceCeil, niceSeconds, shortDay, weekday } from "./chart-scale";
import { StatCard } from "./StatCard";
import { useWidth } from "./use-width";

type Metric = "listen" | "create" | "plays";

const METRICS: readonly { value: Metric; label: string }[] = [
  { value: "listen", label: "Listening" },
  { value: "create", label: "Creating" },
  { value: "plays", label: "Songs started" },
];

const HEIGHT = 200;
const PAD = { top: 10, right: 12, bottom: 26, left: 48 };

/** Time spent (or songs started) over the range: an area with a crosshair that snaps to each day. */
export function ActivityChart({ series }: { series: readonly DayPoint[] }) {
  const [metric, setMetric] = useState<Metric>("listen");
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const kind = metric === "plays" ? "count" : "time";
  const values = series.map((point) => point[metric]);
  const peak = Math.max(0, ...values);
  const top = kind === "time" ? niceSeconds(peak) : niceCeil(Math.max(peak, 4));
  const weekly = (series[0]?.days ?? 1) > 1;

  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (series.length > 1 ? (i / (series.length - 1)) * plotWidth : plotWidth / 2);
  const y = (v: number) => PAD.top + plotHeight - (v / top) * plotHeight;

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(values.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  // About one date label per 90 px, always including the last day.
  const labelEvery = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(plotWidth / 90))));
  const label = (key: string) => (series.length <= 7 && !weekly ? weekday(key) : shortDay(key));
  const pointName = (point: DayPoint) => (weekly ? `Week of ${shortDay(point.key)}` : longDay(point.key));

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - box.left - PAD.left) / plotWidth;
    setHover(Math.min(series.length - 1, Math.max(0, Math.round(fraction * (series.length - 1)))));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    setHover((i) => Math.min(series.length - 1, Math.max(0, (i ?? series.length - 1) + move)));
  };

  const hovered = hover === null ? undefined : series[hover];
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <StatCard
      title="Activity"
      subtitle={`${formatValue(total, kind)} ${metric === "plays" ? "songs started" : metric === "create" ? "in the studio" : "of music"} over the period${weekly ? ", by week" : ""}`}
      actions={<Segmented label="Show" compact value={metric} options={METRICS} onChange={setMetric} />}
    >
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Activity chart. Use the arrow keys to read each ${weekly ? "week" : "day"}.`}
          tabIndex={0}
          className="block touch-pan-y select-none rounded-control"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover((i) => i ?? series.length - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={onKeyDown}
        >
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(top * fraction)} y2={y(top * fraction)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(top * fraction)} dy="0.32em" textAnchor="end" className="fill-text-muted text-[10px] tabular-nums">
                {formatValue(top * fraction, kind)}
              </text>
            </g>
          ))}
          <path d={area} className="fill-accent/10" />
          <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-accent" />
          {series.map((point, i) =>
            i % labelEvery === (series.length - 1) % labelEvery ? (
              <text
                key={point.key}
                x={x(i)}
                y={HEIGHT - 6}
                // The ends are anchored inward, so they never spill out of the card.
                textAnchor={i === series.length - 1 ? "end" : i === 0 ? "start" : "middle"}
                className="fill-text-muted text-[10px]"
              >
                {label(point.key)}
              </text>
            ) : null,
          )}
          {hovered && hover !== null && (
            <g aria-hidden>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotHeight} className="stroke-text-muted" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hovered[metric])} r={4.5} strokeWidth={2} className="fill-accent stroke-surface" />
            </g>
          )}
        </svg>
        {hovered && hover !== null && (
          <ChartTooltip x={x(hover)} y={y(hovered[metric])} width={width} value={formatValue(hovered[metric], kind)} label={pointName(hovered)} />
        )}
        <table className="sr-only">
          <caption>Activity by {weekly ? "week" : "day"}</caption>
          <tbody>
            {series.map((point) => (
              <tr key={point.key}>
                <th scope="row">{pointName(point)}</th>
                <td>{formatValue(point[metric], kind)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StatCard>
  );
}
