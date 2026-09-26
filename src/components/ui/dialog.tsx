import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Extra content on the right of the header (e.g. a switch). */
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A modal with a title and description (both required: they are what screen readers announce). */
export function Dialog({ open, onOpenChange, title, description, headerAction, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "surface fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(92vw,44rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden shadow-overlay",
            className,
          )}
        >
          <header className="flex items-start gap-4 border-b px-5 py-4">
            <div className="flex-1">
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-text-muted">{description}</DialogPrimitive.Description>
            </div>
            {headerAction}
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-control p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <footer className="flex justify-end gap-2 border-t px-5 py-3">{children}</footer>;
}
