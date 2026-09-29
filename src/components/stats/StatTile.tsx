import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Relative change vs the previous period (`0.25` = +25 %), `null` when there is nothing to compare. */
  delta?: number | null;
  /** A short line under the value. */
  note?: ReactNode;
  /** Values of the period, oldest first, drawn as a tiny trend line. */
  trend?: readonly number[];
}

/** A headline number of the dashboard, with its change and trend. */
export function StatTile({ label, value, icon: Icon, delta, note, trend }: StatTileProps) {
  const rounded = delta === undefined || delta === null ? null : Math.round(delta * 100);
  const up = rounded !== null && rounded >= 0;
  const DeltaIcon = up ? TrendingUp : TrendingDown;
  return (
    <div className="surface flex min-w-0 flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
        <span className="truncate">{label}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tile bg-accent/10 text-accent" aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 text-xs text-text-muted">
        {rounded !== null && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-success" : "text-danger")}>
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden />
            {up ? "+" : ""}
            {rounded} %<span className="sr-only"> vs the previous period</span>
          </span>
        )}
        {note}
      </div>
      {trend && <Sparkline values={trend} />}
    </div>
  );
}
