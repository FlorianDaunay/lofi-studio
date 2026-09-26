import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Accessible name (not shown). */
  label: string;
}

/** A styled native select: keyboard and screen-reader support come for free. */
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <select
      aria-label={label}
      className={cn(
        "h-9 w-full rounded-control border bg-surface px-2 text-sm text-text-primary shadow-control hover:bg-surface-hover",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
