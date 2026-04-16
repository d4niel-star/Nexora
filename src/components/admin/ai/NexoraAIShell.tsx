"use client";

import { Sparkles, Megaphone, TrendingUp, ChevronRight, PackageCheck, Package, LayoutTemplate } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const AI_CONTEXTS = [
  { key: "general", label: "General", href: "/admin/ai", icon: Sparkles },
  { key: "ads", label: "Ads", href: "/admin/ai/ads", icon: Megaphone },
  { key: "finances", label: "Finanzas", href: "/admin/ai/finances", icon: TrendingUp },
  { key: "operations", label: "Operación", href: "/admin/ai/operations", icon: PackageCheck },
  { key: "catalog", label: "Catálogo", href: "/admin/ai/catalog", icon: Package },
  { key: "store-builder", label: "Tienda IA", href: "/admin/ai/store-builder", icon: LayoutTemplate },
] as const;

interface NexoraAIShellProps {
  contextName: string;
  contextIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function NexoraAIShell({ contextName, contextIcon, children }: NexoraAIShellProps) {
  const pathname = usePathname();

  const activeContext = AI_CONTEXTS.find(c => {
    if (c.key === "general") return pathname === "/admin/ai";
    return pathname.startsWith(c.href);
  }) || AI_CONTEXTS[0];

  const isHub = pathname === "/admin/ai";

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] rounded-2xl border border-[#EAEAEA] shadow-sm overflow-hidden">
      {/* Compact Header — Identity + Breadcrumb + Context Switcher */}
      <div className="shrink-0 border-b border-[#EAEAEA] bg-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 px-6 sm:px-8 pt-5 pb-4">
          {/* Row 1: Identity badge + breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <Link 
              href="/admin/ai"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-3 py-1 shadow-sm hover:bg-black transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-bold tracking-widest text-white uppercase">Nexora AI</span>
            </Link>
            
            {!isHub && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#EAEAEA] px-3 py-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-widest text-[#888888] uppercase">
                    {contextName}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Row 2: Context switcher */}
          <nav className="flex items-center gap-1" aria-label="Contextos de Nexora AI">
            {AI_CONTEXTS.map((ctx) => {
              const Icon = ctx.icon;
              const isActive = ctx.key === activeContext.key;
              return (
                <Link
                  key={ctx.key}
                  href={ctx.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                    isActive
                      ? "bg-[#111111] text-white shadow-sm"
                      : "text-[#888888] hover:text-[#111111] hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {ctx.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
