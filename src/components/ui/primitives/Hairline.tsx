import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Hairline ───
// 1px token-based divider. Use instead of border-t/border-b ad-hoc rules so
// every divider in the product reads with the exact same weight.
// `orientation="vertical"` requires a host with height (flex child).
export interface HairlineProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  strong?: boolean;
}

export const Hairline = React.forwardRef<HTMLDivElement, HairlineProps>(
  ({ orientation = "horizontal", strong = false, className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal"
          ? "h-px w-full"
          : "w-px self-stretch min-h-full",
        strong ? "bg-[color:var(--hairline-strong)]" : "bg-[color:var(--hairline)]",
        className,
      )}
      {...props}
    />
  ),
);
Hairline.displayName = "Hairline";
