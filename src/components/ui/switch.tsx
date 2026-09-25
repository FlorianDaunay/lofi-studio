import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useId } from "react";

interface SwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ label, checked, onCheckedChange }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-5 w-9 shrink-0 rounded-pill border bg-surface-hover transition-colors data-[state=checked]:bg-accent"
      >
        <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-pill bg-text-secondary transition-transform data-[state=checked]:translate-x-[1.125rem] data-[state=checked]:bg-accent-foreground" />
      </SwitchPrimitive.Root>
      <label htmlFor={id} className="cursor-pointer select-none text-xs text-text-secondary">
        {label}
      </label>
    </div>
  );
}
