import * as React from "react";
import { cn } from "@/lib/utils";

// ─── DisplayText ───
// Display type for heroes, section titles and empty-state headlines.
// Uses Inter at weight 600 with very tight tracking — no serif anywhere.
// Ultra-serious: sizes bumped slightly down and tracking pushed to
// −0.035em so the product reads "architectural", not "editorial".
type DisplaySize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<DisplaySize, string> = {
  sm: "text-[24px] sm:text-[30px] leading-[1.1]",
  md: "text-[30px] sm:text-[42px] leading-[1.04]",
  lg: "text-[40px] sm:text-[58px] leading-[1.02]",
  xl: "text-[48px] sm:text-[72px] leading-[0.99]",
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
        "font-sans font-bold tracking-[var(--tracking-display)] text-ink-0",
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  ),
);
DisplayText.displayName = "DisplayText";
