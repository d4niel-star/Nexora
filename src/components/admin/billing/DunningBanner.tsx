"use client";

import Link from "next/link";
import { AlertTriangle, XCircle, CreditCard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DunningState } from "@/lib/billing/dunning";

interface DunningBannerProps {
  state: DunningState;
}

const statusConfig = {
  warning: {
    bg: "bg-[#FEF3C7]",
    border: "border-[#FCD34D]",
    text: "text-[#92400E]",
    icon: AlertTriangle,
    iconColor: "text-[#D97706]",
  },
  critical: {
    bg: "bg-[#FEE2E2]",
    border: "border-[#FECACA]",
    text: "text-[#991B1B]",
    icon: XCircle,
    iconColor: "text-[#DC2626]",
  },
  dead: {
    bg: "bg-[#FEE2E2]",
    border: "border-[#FECACA]",
    text: "text-[#991B1B]",
    icon: XCircle,
    iconColor: "text-[#DC2626]",
  },
  ok: {
    bg: "bg-transparent",
    border: "border-transparent",
    text: "text-ink-0",
    icon: CreditCard,
    iconColor: "text-ink-5",
  },
};

export function DunningBanner({ state }: DunningBannerProps) {
  const config = statusConfig[state.status];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2.5 md:px-8",
        config.bg,
        config.border,
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", config.iconColor)}
        strokeWidth={1.75}
      />
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <span
          className={cn(
            "text-[12px] font-semibold uppercase tracking-[0.06em]",
            config.text,
          )}
        >
          {state.label}
        </span>
        <span className={cn("text-[12px] leading-[1.4]", config.text)}>
          {state.message}
        </span>
      </div>
      <Link
        href={state.ctaHref}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[11px] font-semibold transition-colors",
          state.status === "warning"
            ? "bg-[#92400E] text-white hover:bg-[#78350F]"
            : "bg-[#991B1B] text-white hover:bg-[#7F1D1D]",
        )}
      >
        {state.ctaLabel}
        <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </Link>
    </div>
  );
}
