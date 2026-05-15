import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ssicsim-brand-gold)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[var(--ssicsim-brand-gold)] text-white hover:bg-[#8a6f1b]",
        secondary:
          "border border-[var(--ssicsim-brand-gold)] bg-white text-[var(--ssicsim-brand-gold)] hover:bg-[var(--ssicsim-brand-gold-soft)]",
        ghost:
          "border border-[var(--ssicsim-border)] bg-white text-[var(--ssicsim-brand-navy)] hover:border-[var(--ssicsim-brand-gold)] hover:bg-[var(--ssicsim-brand-gold-soft)]",
        danger: "border border-transparent bg-red-600 text-white hover:bg-red-700"
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        lg: "h-10 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
