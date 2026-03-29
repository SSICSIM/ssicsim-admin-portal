import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-white/10 text-white",
        secondary: "bg-white/5 text-white/80",
        success: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
        warning: "bg-amber-500/20 text-amber-200 border-amber-500/40"
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
