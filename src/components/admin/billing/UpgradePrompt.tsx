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
  enterprise: "Enterprise",
};

export function UpgradePrompt({ title, description, feature, planCode, className }: UpgradePromptProps) {
  return (
     <div className={cn("rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] px-6 py-8 text-center relative overflow-hidden", className)}>
        {/* Decorative gloss */}
        <div className="absolute top-0 left-1/2 -ml-[200px] w-[400px] h-[1px] bg-gradient-to-r from-transparent via-[#CCCCCC] to-transparent opacity-50" />
        
        <div className="mx-auto w-12 h-12 bg-[#F0F0F0] rounded-xl flex items-center justify-center mb-4 text-[#666666] border border-[#E5E5E5] relative z-10">
           {feature === "ai_credits" ? <Sparkles className="w-6 h-6" /> : feature === "advanced" ? <Zap className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        </div>
        
        <h3 className="text-xl font-extrabold text-[#111111] leading-tight mb-2 relative z-10">{title}</h3>
        <p className="text-[14px] text-[#666666] leading-relaxed max-w-sm mx-auto mb-8 relative z-10">{description}</p>
        
        <div className="relative z-10 flex flex-col items-center">
           <Link href="/admin/billing" className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black shadow-md">
             Ver plan y créditos <ArrowRight className="w-4 h-4" />
           </Link>
           {planCode && (
             <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-[#999999]">Recomendado: Plan {PLAN_DISPLAY_NAMES[planCode] || planCode}</p>
           )}
        </div>
     </div>
  );
}
