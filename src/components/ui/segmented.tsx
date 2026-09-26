import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A single-choice button group (radio semantics, arrow-key navigation). */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <ToggleGroup.Root
        type="single"
        value={value}
        aria-label={label}
        // Radix reports "" when the active item is clicked again: ignore, one option stays selected.
        onValueChange={(next) => next && onChange(next as T)}
        className="flex flex-wrap gap-1 rounded-control border bg-canvas p-0.5"
      >
        {options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "flex-1 whitespace-nowrap rounded-control px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary",
              "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
            )}
          >
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
