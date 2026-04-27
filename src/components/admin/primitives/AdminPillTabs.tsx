"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminPillTabs ───────────────────────────────────────────────────────
// Pill-shaped tabs on a hairline strip. Replaces the previous
// border-bottom underline pattern (`border-b-2 border-ink-0`) used in
// catalog, orders, store, and settings. Every tab is a `rounded-full`
// chip with a subtle hover; the active tab fills with `--brand` + white
// text, providing a clear focal point without the editorial underline.

export interface AdminPillTab<T extends string = string> {
  value: T;
  label: ReactNode;
  count?: number | null;
  /** Mark a special / warning tab (e.g. "Con problemas"). */
  warning?: boolean;
  disabled?: boolean;
}

interface AdminPillTabsProps<T extends string = string> {
  tabs: AdminPillTab<T>[];
  active: T;
  onChange: (next: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function AdminPillTabs<T extends string = string>({
  tabs,
  active,
  onChange,
  className,
  size = "md",
}: AdminPillTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("admin-pill-tabs", `admin-pill-tabs--${size}`, className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className={cn(
              "admin-pill-tab",
              isActive && "admin-pill-tab--active",
              tab.warning && "admin-pill-tab--warning",
              tab.disabled && "admin-pill-tab--disabled",
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count !== undefined && tab.count > 0 && (
              <span className="admin-pill-tab-count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
