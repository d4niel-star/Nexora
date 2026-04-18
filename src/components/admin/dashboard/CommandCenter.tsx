"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  CircleDollarSign,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCenterData, CommandDirective, CommandDomain, CommandPriority } from "@/types/command-center";
import { buildVariantHref } from "@/lib/navigation/hrefs";

export function CommandCenter({ data }: { data: CommandCenterData }) {
  const { directives, kpis } = data;
  const hasDirectives = directives.length > 0;

  const criticals = directives.filter((d) => d.priority === "critical");
  const highs = directives.filter((d) => d.priority === "high");
  const mediums = directives.filter((d) => d.priority === "medium");
  const lows = directives.filter((d) => d.priority === "low");

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <Zap className="w-5 h-5 text-[#111111]" />
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111111]">
            Comando comercial
          </h1>
        </div>
        <p className="text-sm font-medium text-[#666666]">
          Decisiones priorizadas para tu negocio hoy. Basado en ventas, margen, stock y operación real.
        </p>
      </header>

      {/* ─── KPI Strip ─── */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiChip
          label="Revenue 30d"
          value={formatCurrency(kpis.revenue30d)}
          accent={kpis.revenue30d > 0}
          accentColor="blue"
        />
        <KpiChip
          label="Unidades 30d"
          value={String(kpis.unitsSold30d)}
        />
        <KpiChip
          label="Margen neto"
          value={kpis.avgMarginPercent !== null ? `${kpis.avgMarginPercent}%` : "—"}
          accent={kpis.avgMarginPercent !== null && kpis.avgMarginPercent < 15}
          accentColor="amber"
        />
        <KpiChip
          label="Stock critico"
          value={String(kpis.criticalStock)}
          accent={kpis.criticalStock > 0}
          accentColor="red"
        />
        <KpiChip
          label="Variantes criticas"
          value={String(kpis.criticalVariants)}
          accent={kpis.criticalVariants > 0}
          accentColor="red"
          variantId={kpis.firstCriticalVariantId}
          action="adjust"
        />
        <KpiChip
          label="Riesgo oculto"
          value={String(kpis.hiddenVariantRiskProducts)}
          accent={kpis.hiddenVariantRiskProducts > 0}
          accentColor="orange"
          variantId={kpis.firstHiddenVariantId}
        />
      </section>

      {/* ─── Directive Groups ─── */}
      {hasDirectives ? (
        <div className="space-y-8">
          {criticals.length > 0 && (
            <DirectiveGroup directives={criticals} label="Accion inmediata" priority="critical" />
          )}
          {highs.length > 0 && (
            <DirectiveGroup directives={highs} label="Prioridad alta" priority="high" />
          )}
          {mediums.length > 0 && (
            <DirectiveGroup directives={mediums} label="Oportunidades" priority="medium" />
          )}
          {lows.length > 0 && (
            <DirectiveGroup directives={lows} label="Para evaluar" priority="low" />
          )}
        </div>
      ) : (
        <EmptyCommandState />
      )}
    </div>
  );
}

// ─── Sub-components ───

function KpiChip({ label, value, accent = false, accentColor = "amber", variantId, action }: { label: string; value: string; accent?: boolean; accentColor?: string; variantId?: string | null; action?: "adjust" | "reorder" }) {
  const router = useRouter();
  const borderMap: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
    orange: "border-orange-200 bg-orange-50",
  };
  const textMap: Record<string, string> = {
    red: "text-red-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    orange: "text-orange-700",
  };

  const isClickable = variantId && variantId.length > 0;

  const handleClick = () => {
    if (isClickable) {
      router.push(buildVariantHref(variantId, action));
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm transition-colors",
        accent ? (borderMap[accentColor] ?? "border-amber-200 bg-amber-50") : "border-[#EAEAEA] bg-white",
        isClickable && "cursor-pointer hover:opacity-80 underline decoration-dotted underline-offset-2"
      )}
      onClick={isClickable ? handleClick : undefined}
      title={isClickable ? "Ver en inventory" : undefined}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888888]">{label}</p>
      <p className={cn(
        "mt-1 text-xl font-black tabular-nums",
        accent ? (textMap[accentColor] ?? "text-amber-700") : "text-[#111111]"
      )}>{value}</p>
    </div>
  );
}

function DirectiveGroup({ directives, label, priority }: { directives: CommandDirective[]; label: string; priority: CommandPriority }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <PriorityDot priority={priority} />
        <h2 className={cn(
          "text-[11px] font-bold uppercase tracking-[0.18em]",
          priority === "critical" ? "text-red-600" : priority === "high" ? "text-amber-600" : priority === "medium" ? "text-blue-600" : "text-[#888888]"
        )}>{label}</h2>
        <span className={cn(
          "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          priority === "critical" ? "bg-red-100 text-red-700"
            : priority === "high" ? "bg-amber-100 text-amber-700"
            : priority === "medium" ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-500"
        )}>{directives.length}</span>
      </div>
      <div className="space-y-3">
        {directives.map((d) => (
          <DirectiveCard key={d.id} directive={d} />
        ))}
      </div>
    </section>
  );
}

function DirectiveCard({ directive }: { directive: CommandDirective }) {
  const d = directive;
  return (
    <Link
      href={d.href}
      className={cn(
        "group flex items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
        d.priority === "critical"
          ? "border-red-200 hover:border-red-300"
          : d.priority === "high"
            ? "border-amber-200 hover:border-amber-300"
            : d.priority === "medium"
              ? "border-blue-100 hover:border-blue-200"
              : "border-[#EAEAEA] hover:border-gray-300"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        d.priority === "critical" ? "bg-red-100"
          : d.priority === "high" ? "bg-amber-100"
          : d.priority === "medium" ? "bg-blue-50"
          : "bg-gray-100"
      )}>
        <DomainIcon domain={d.domain} priority={d.priority} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-[#111111]">{d.title}</p>
          {d.productCount && d.productCount > 0 && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-[#666666]">
              {d.productCount} SKU{d.productCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#666666]">{d.reason}</p>
        {d.evidence && (
          <p className="mt-1.5 text-[11px] font-medium text-[#999999] italic">{d.evidence}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-center text-xs font-bold text-[#AAAAAA] transition-colors group-hover:text-[#111111]">
        {d.actionLabel} <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function DomainIcon({ domain, priority }: { domain: CommandDomain; priority: CommandPriority }) {
  const cls = cn(
    "h-4 w-4",
    priority === "critical" ? "text-red-600"
      : priority === "high" ? "text-amber-600"
      : priority === "medium" ? "text-blue-600"
      : "text-[#888888]"
  );

  switch (domain) {
    case "revenue": return <TrendingUp className={cls} />;
    case "margin": return <CircleDollarSign className={cls} />;
    case "stock": return <Box className={cls} />;
    case "sourcing": return <Truck className={cls} />;
    case "operations": return <ShoppingCart className={cls} />;
    default: return <Sparkles className={cls} />;
  }
}

function PriorityDot({ priority }: { priority: CommandPriority }) {
  return (
    <span className={cn(
      "h-2 w-2 rounded-full",
      priority === "critical" ? "bg-red-500" : priority === "high" ? "bg-amber-500" : priority === "medium" ? "bg-blue-400" : "bg-gray-400"
    )} />
  );
}

function EmptyCommandState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEAEA] bg-white px-6 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 shadow-sm">
        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
      </div>
      <h3 className="text-lg font-extrabold text-[#111111]">Sin decisiones pendientes</h3>
      <p className="mt-2 max-w-md text-sm font-medium text-[#888888]">
        No hay acciones comerciales urgentes. Cuando algo requiera atencion, aparecera aca automaticamente.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-xs font-bold text-[#111111] shadow-sm transition-colors hover:bg-gray-50"
        >
          <Package className="h-3.5 w-3.5" /> Catalogo
        </Link>
        <Link
          href="/admin/ai"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-xs font-bold text-[#111111] shadow-sm transition-colors hover:bg-gray-50"
        >
          <Sparkles className="h-3.5 w-3.5" /> Nexora AI
        </Link>
        <Link
          href="/admin/finances?tab=rentabilidad"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-xs font-bold text-[#111111] shadow-sm transition-colors hover:bg-gray-50"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Margenes
        </Link>
      </div>
    </div>
  );
}
