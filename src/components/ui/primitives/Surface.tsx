import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Surface ───
// Abstracts the three canonical planes of the Nexora canvas so no component
// hardcodes a hex. Use `level` to pick:
//   - 0: pure white (commerce cards, modal bodies)
//   - 1: canvas (app background — rarely a card)
//   - 2: raised (default panels, sidebar)
//   - 3: sunken (hover rows, secondary strips)
// `hairline` adds the token-based border. Never combine with Tailwind border-*.
type SurfaceLevel = 0 | 1 | 2 | 3;

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  hairline?: boolean;
  radius?: "none" | "sm" | "md" | "lg" | "xl";
  as?: "div" | "section" | "article" | "aside";
}

const LEVEL_CLASS: Record<SurfaceLevel, string> = {
  0: "bg-[var(--surface-0)]",
  1: "bg-[var(--surface-1)]",
  2: "bg-[var(--surface-2)]",
  3: "bg-[var(--surface-3)]",
};

const RADIUS_CLASS: Record<NonNullable<SurfaceProps["radius"]>, string> = {
  none: "",
  sm: "rounded-[var(--r-sm)]",
  md: "rounded-[var(--r-md)]",
  lg: "rounded-[var(--r-lg)]",
  xl: "rounded-[var(--r-xl)]",
};

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  (
    { level = 2, hairline = false, radius = "lg", as: Tag = "div", className, ...props },
    ref,
  ) => (
    <Tag
      ref={ref as never}
      className={cn(
        LEVEL_CLASS[level],
        RADIUS_CLASS[radius],
        hairline && "border border-[color:var(--hairline)]",
        className,
      )}
      {...props}
    />
  ),
);
Surface.displayName = "Surface";
