import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

export function DropdownContent({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn("surface z-50 min-w-64 p-1 shadow-overlay", className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

interface DropdownItemProps extends Omit<ComponentProps<typeof DropdownPrimitive.Item>, "children"> {
  icon: ReactNode;
  label: string;
  hint?: string;
}

export function DropdownItem({ icon, label, hint, className, ...props }: DropdownItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-3 rounded-control px-3 py-2 text-sm outline-none transition-colors",
        "data-[highlighted]:bg-surface-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <span className="text-accent" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-text-muted">{hint}</span>}
      </span>
    </DropdownPrimitive.Item>
  );
}

export const DropdownSeparator = ({ className }: { className?: string }) => (
  <DropdownPrimitive.Separator className={cn("my-1 h-px bg-border", className)} />
);
