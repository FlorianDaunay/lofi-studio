/** A tiny line of the trend: no axes, it only shows the shape. */
export function Sparkline({ values }: { values: readonly number[] }) {
  const max = Math.max(...values, 0);
  if (values.length < 2 || max <= 0) return null;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden className="h-8 w-full overflow-visible">
      <polygon points={`0,30 ${points} 100,30`} className="fill-accent/10" />
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-accent" />
    </svg>
  );
}
