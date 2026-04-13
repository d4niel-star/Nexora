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

export function UpgradePrompt({ title, description, feature, planCode, className }: UpgradePromptProps) {
  return (
     <div className={cn("rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white px-6 py-8 text-center shadow-sm relative overflow-hidden", className)}>
        {/* Decorative gloss */}
        <div className="absolute top-0 left-1/2 -ml-[200px] w-[400px] h-[1px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
        
        <div className="mx-auto w-12 h-12 bg-indigo-100/80 rounded-xl flex items-center justify-center mb-4 text-indigo-600 border border-indigo-200 shadow-sm relative z-10">
           {feature === "ai_credits" ? <Sparkles className="w-6 h-6" /> : feature === "advanced" ? <Zap className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        </div>
        
        <h3 className="text-xl font-extrabold text-[#111111] leading-tight mb-2 relative z-10">{title}</h3>
        <p className="text-[14px] text-[#666666] leading-relaxed max-w-sm mx-auto mb-8 relative z-10">{description}</p>
        
        <div className="relative z-10 flex flex-col items-center">
           <Link href="/admin/billing" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black/80 shadow-md">
             Comprar más créditos o mejorar plan <ArrowRight className="w-4 h-4" />
           </Link>
           {planCode && (
             <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-indigo-400">Recomendado: Plan {planCode}</p>
           )}
        </div>
     </div>
  );
}
