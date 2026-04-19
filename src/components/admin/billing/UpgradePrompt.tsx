"use client";

import { Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  title: string;
  description: string;
  feature?: "ai_credits" | "custom_domain" | "advanced";
  planCode?: string;
  className?: string;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  core: "Core",
  growth: "Growth",
  scale: "Scale",
};

export function UpgradePrompt({ title, description, feature, planCode, className }: UpgradePromptProps) {
  return (
     <div className={cn("rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-8 text-center", className)}>
        <div className="mx-auto w-10 h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] flex items-center justify-center mb-5 text-ink-4">
           {feature === "ai_credits" ? <Sparkles className="w-4 h-4" strokeWidth={1.75} /> : feature === "advanced" ? <Zap className="w-4 h-4" strokeWidth={1.75} /> : <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />}
        </div>
        
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0 leading-[1.2] mb-2">{title}</h3>
        <p className="text-[13px] leading-[1.55] text-ink-5 max-w-sm mx-auto mb-6">{description}</p>
        
        <div className="flex flex-col items-center">
           <Link href="/admin/billing" className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
             Ver plan y créditos <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
           </Link>
           {planCode && (
             <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Recomendado: plan {PLAN_DISPLAY_NAMES[planCode] || planCode}</p>
           )}
        </div>
     </div>
  );
}
