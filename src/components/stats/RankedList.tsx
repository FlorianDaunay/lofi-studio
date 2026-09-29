import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface RankedItem {
  key: string;
  label: string;
  /** A second line (e.g. a share of the total). */
  detail?: string;
  value: number;
  /** A cover or an icon before the label. */
  leading?: ReactNode;
}

interface RankedListProps {
  items: readonly RankedItem[];
  format: (value: number) => string;
  /** Rows become buttons: the selected one is highlighted. */
  selected?: string | null;
  onSelect?: (key: string) => void;
}

/** Biggest first, each with a thin bar scaled to the first: a ranking that also reads as a chart. */
export function RankedList({ items, format, selected, onSelect }: RankedListProps) {
  const max = items[0]?.value ?? 0;
  return (
    <ol className="flex flex-col gap-1">
      {items.map((item, rank) => {
        const content = (
          <>
            <span className="w-4 shrink-0 text-right text-xs tabular-nums text-text-muted">{rank + 1}</span>
            {item.leading}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm">{item.label}</span>
                <span className="shrink-0 text-xs font-medium tabular-nums">{format(item.value)}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-pill bg-surface-hover" aria-hidden>
                <span
                  className="block h-full rounded-pill bg-accent motion-safe:transition-[width] motion-safe:duration-500"
                  style={{ width: `${max > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }}
                />
              </span>
              {item.detail && <span className="truncate text-xs text-text-muted">{item.detail}</span>}
            </span>
          </>
        );
        const row = "flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left";
        return (
          <li key={item.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-pressed={selected === item.key}
                className={cn(row, "transition-colors hover:bg-surface-hover", selected === item.key && "bg-accent/10")}
              >
                {content}
              </button>
            ) : (
              <div className={row}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
