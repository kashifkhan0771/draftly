import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-th-border bg-transparent px-3 py-2 text-sm text-th-text placeholder:text-th-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--th-accent)]/30 focus-visible:border-[var(--th-accent)]/50 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
