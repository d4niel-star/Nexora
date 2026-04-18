import * as React from "react";
import { cn } from "@/lib/utils";

// ─── DisplayText ───
// Editorial display type for heroes, section titles and empty-state headlines.
// Uses Instrument Serif (`var(--font-display)`) with very tight tracking.
// Never use for body copy, buttons or labels — those stay on Inter.
//
// Size maps to tasteful responsive steps (mobile-first).
type DisplaySize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<DisplaySize, string> = {
  sm: "text-[28px] sm:text-[36px] leading-[1.02]",
  md: "text-[40px] sm:text-[52px] leading-[1.0]",
  lg: "text-[52px] sm:text-[72px] leading-[0.98]",
  xl: "text-[64px] sm:text-[92px] leading-[0.96]",
};

export interface DisplayTextProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: DisplaySize;
  as?: "h1" | "h2" | "h3" | "span" | "p";
}

export const DisplayText = React.forwardRef<HTMLHeadingElement, DisplayTextProps>(
  ({ size = "md", as: Tag = "h2", className, ...props }, ref) => (
    <Tag
      ref={ref as never}
      className={cn(
        "font-display font-normal tracking-[-0.02em] text-ink-0",
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  ),
);
DisplayText.displayName = "DisplayText";
