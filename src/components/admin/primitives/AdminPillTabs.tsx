"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminPillTabs · Studio v4 wrapper ─────────────────────────────────
//
// Back-compat shim. The pill (rounded-full / brand-fill) tabs are
// retired in favour of sober underline tabs (`.nx-tabs` + `.nx-tab`),
// which are denser and Shopify-clear. The shim keeps the same API so
// existing call sites work untouched; legacy props (`warning`,
// `disabled`, `size`) are silently ignored when they no longer make
// sense in v4.

export interface AdminPillTab<T extends string = string> {
  value: T;
  label: ReactNode;
  count?: number | null;
  /** @deprecated Studio v4 doesn't render warning-tinted tabs. */
  warning?: boolean;
  disabled?: boolean;
}

interface AdminPillTabsProps<T extends string = string> {
  tabs: AdminPillTab<T>[];
  active: T;
  onChange: (next: T) => void;
  className?: string;
  /** @deprecated Studio v4 ships a single density. */
  size?: "sm" | "md";
}

export function AdminPillTabs<T extends string = string>({
  tabs,
  active,
  onChange,
  className,
}: AdminPillTabsProps<T>) {
  return (
    <div role="tablist" className={cn("nx-tabs", className)}>
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-active={isActive ? "true" : undefined}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className="nx-tab"
          >
            {tab.label}
            {tab.count !== null && tab.count !== undefined && tab.count > 0 ? (
              <span className="nx-tab__count">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
