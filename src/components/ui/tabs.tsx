import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-control border bg-canvas p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary",
        "data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-control",
        className,
      )}
      {...props}
    />
  );
}
