import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-accent bg-accent text-accent-foreground shadow-control hover:border-accent-hover hover:bg-accent-hover active:shadow-inset",
        secondary: "bg-surface text-text-primary shadow-control hover:bg-surface-hover active:shadow-inset",
        ghost: "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        icon: "h-9 w-9",
        hero: "h-16 w-16 rounded-pill",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
