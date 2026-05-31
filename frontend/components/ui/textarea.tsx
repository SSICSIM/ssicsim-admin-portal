import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-[100px] w-full rounded-lg border border-[var(--ssicsim-border)] bg-white px-3 py-2 text-sm text-[var(--ssicsim-text)] placeholder:text-[var(--ssicsim-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ssicsim-brand-gold)] focus-visible:ring-offset-2 resize-none transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
