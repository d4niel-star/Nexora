import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminSplit ──────────────────────────────────────────────────────────
// Two-column layout primitive: main content + side rail. Used by hubs
// where the right rail hosts secondary panels (recommendations, status,
// integrations, audit log). At lg+ the rail has a fixed-ish width; on
// smaller viewports it stacks below.

interface AdminSplitProps {
  main: ReactNode;
  rail: ReactNode;
  ratio?: "8-4" | "7-5" | "9-3";
  gap?: "md" | "lg";
  className?: string;
}

const RATIO_MAP: Record<NonNullable<AdminSplitProps["ratio"]>, string> = {
  "8-4": "lg:grid-cols-[2fr_1fr]",
  "7-5": "lg:grid-cols-[1.4fr_1fr]",
  "9-3": "lg:grid-cols-[3fr_1fr]",
};

export function AdminSplit({
  main,
  rail,
  ratio = "8-4",
  gap = "md",
  className,
}: AdminSplitProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1",
        gap === "lg" ? "gap-6 lg:gap-8" : "gap-5 lg:gap-6",
        RATIO_MAP[ratio],
        className,
      )}
    >
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0 flex flex-col gap-5">{rail}</aside>
    </div>
  );
}
