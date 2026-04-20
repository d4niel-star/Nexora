"use client";

import { Sparkles, Megaphone, TrendingUp, ChevronRight, PackageCheck, Package } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Tienda IA was promoted to a top-level module (sidebar entry + /admin/store-ai).
// It deliberately no longer lives here as an AI context — the module has its own
// shell, landing and navigation.
const AI_CONTEXTS = [
  { key: "general", label: "General", href: "/admin/ai", icon: Sparkles },
  { key: "ads", label: "Ads", href: "/admin/ai/ads", icon: Megaphone },
  { key: "finances", label: "Finanzas", href: "/admin/ai/finances", icon: TrendingUp },
  { key: "operations", label: "Operación", href: "/admin/ai/operations", icon: PackageCheck },
  { key: "catalog", label: "Catálogo", href: "/admin/ai/catalog", icon: Package },
] as const;

interface NexoraAIShellProps {
  contextName: string;
  contextIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function NexoraAIShell({ contextName, contextIcon: _contextIcon, children }: NexoraAIShellProps) {
  const pathname = usePathname();

  const activeContext = AI_CONTEXTS.find(c => {
    if (c.key === "general") return pathname === "/admin/ai";
    return pathname.startsWith(c.href);
  }) || AI_CONTEXTS[0];

  const isHub = pathname === "/admin/ai";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)]">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[color:var(--chrome-accent-line)] to-transparent opacity-90" aria-hidden />
      {/* Compact Header — Identity + Breadcrumb + Context Switcher */}
      <div className="relative shrink-0 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="relative z-10 px-6 pb-4 pt-5 sm:px-8">
          {/* Row 1: Identity badge + breadcrumb */}
          <div className="mb-4 flex items-center gap-2">
            <Link
              href="/admin/ai"
              className="inline-flex items-center gap-1.5 rounded-[var(--r-full)] bg-ink-0 px-3 py-1 shadow-[var(--shadow-soft)] transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <Sparkles className="h-3.5 w-3.5 text-ink-12" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-12">Nexora AI</span>
            </Link>

            {!isHub && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-ink-7" />
                <div className="inline-flex items-center gap-1.5 rounded-[var(--r-full)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-1 shadow-[var(--shadow-soft)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-success)]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-5">
                    {contextName}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Row 2: Context switcher */}
          <nav className="flex flex-wrap items-center gap-1" aria-label="Contextos de Nexora AI">
            {AI_CONTEXTS.map((ctx) => {
              const Icon = ctx.icon;
              const isActive = ctx.key === activeContext.key;
              return (
                <Link
                  key={ctx.key}
                  href={ctx.href}
                  className={cn(
                    "flex min-h-9 items-center gap-1.5 rounded-[var(--r-md)] px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    isActive
                      ? "bg-ink-0 text-ink-12 shadow-[var(--shadow-soft)]"
                      : "text-ink-5 hover:bg-[var(--surface-3)] hover:text-ink-0",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {ctx.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-[var(--surface-1)] p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
