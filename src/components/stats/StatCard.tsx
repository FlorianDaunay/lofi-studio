import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  /** One line under the title: what the card shows, or its headline insight. */
  subtitle?: ReactNode;
  /** Controls on the right of the title (a view toggle, a link). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A dashboard panel with a title row. */
export function StatCard({ title, subtitle, actions, className, children }: StatCardProps) {
  return (
    <section aria-label={title} className={cn("surface flex min-w-0 flex-col gap-4 p-4 sm:p-5", className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
