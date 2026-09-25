import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  description: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/** An expandable section for advanced controls; collapsed content is not rendered at all. */
export function Panel({ title, description, icon, open, onOpenChange, children }: PanelProps) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange} className="surface overflow-hidden">
      <Collapsible.Trigger className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover">
        <span className="flex h-8 w-8 items-center justify-center rounded-tile bg-accent/10 text-accent" aria-hidden>
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-text-muted">{description}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="border-t px-4 py-4">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
