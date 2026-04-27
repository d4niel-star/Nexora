// ─── Nexora Studio v4 · Tabs (segmented) ────────────────────────────────
//
// Underline tabs aligned with Shopify Admin: a row of labels with a
// brand-navy underline indicating the active tab. No pills, no rounded
// chrome. The container itself draws a hairline that the active tab
// "sits on top of".
//
// Tokens: .nx-tabs, .nx-tab, .nx-tab__count.

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NexoraTab<V extends string = string> {
  value: V;
  label: ReactNode;
  count?: number;
}

export interface NexoraTabsProps<V extends string = string> {
  tabs: ReadonlyArray<NexoraTab<V>>;
  active: V;
  onChange: (v: V) => void;
  className?: string;
}

export function NexoraTabs<V extends string = string>({
  tabs,
  active,
  onChange,
  className,
}: NexoraTabsProps<V>) {
  return (
    <div className={cn("nx-tabs", className)} role="tablist">
      {tabs.map((t) => {
        const selected = t.value === active;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={selected}
            data-active={selected ? "true" : undefined}
            onClick={() => onChange(t.value)}
            className="nx-tab"
          >
            {t.label}
            {typeof t.count === "number" ? (
              <span className="nx-tab__count">{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
