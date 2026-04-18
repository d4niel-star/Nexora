import React from "react";

// ─── Nexora Logo ───
// Token-based glyph matching the landing wordmark. Two overlapping squares:
//  · base square in ink-0 (or ink-12 when `dark=true`)
//  · accent square in the unified accent token
// No stray emerald or hex outside the design system.

export function NexoraLogo({
  className = "w-6 h-6",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const base = dark ? "var(--ink-12)" : "var(--ink-0)";
  const accent = "var(--accent-500)";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* base square */}
      <rect x="6" y="6" width="14" height="14" rx="3.5" fill={base} />
      {/* accent square */}
      <rect x="4" y="4" width="8" height="8" rx="2" fill={accent} />
    </svg>
  );
}
