import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "border-[var(--ssicsim-border)] bg-[var(--ssicsim-surface-soft)] text-[var(--ssicsim-brand-navy)]",
        secondary:
          "border-[#e4cb91] bg-[#fef3dc] text-[#7b5a09]",
        success:
          "border-[#9bc4ad] bg-[#e8f4ed] text-[#1f5b38]",
        warning:
          "border-[#eac98f] bg-[var(--ssicsim-brand-gold-soft)] text-[#825400]",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
