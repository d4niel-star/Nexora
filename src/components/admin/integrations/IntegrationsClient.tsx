"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Plug,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  IntegrationCategory,
  IntegrationState,
  UnifiedConnection,
} from "@/lib/integrations/queries";
import type { HealthCenterData } from "@/types/health";
import { HealthCenter } from "./HealthCenter";
import { EmptyState } from "@/components/ui/EmptyState";

type TabValue = "all" | "payments" | "logistics" | "providers" | "retention" | "ads" | "health";

export function IntegrationsClient({ initialData, healthData }: { initialData: UnifiedConnection[]; healthData: HealthCenterData }) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const tabCounts = useMemo(() => ({
    all: initialData.length,
    payments: initialData.filter(c => c.type === "payment" || c.type === "platform").length,
    logistics: initialData.filter(c => c.type === "logistics").length,
    providers: initialData.filter(c => c.type === "provider").length,
    retention: initialData.filter(c => c.type === "retention").length,
    ads: initialData.filter(c => c.type === "ad_platform").length,
  }), [initialData]);

  // Visible attention count: anything that isn't ready or not_installed.
  // Drives the header chip so the merchant immediately sees "X integraciones
  // necesitan acción" instead of scanning the mosaic.
  const attentionCount = useMemo(
    () =>
      initialData.filter(
        (c) => c.state !== "ready" && c.state !== "not_installed",
      ).length,
    [initialData],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialData.filter(c => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q);
      const matchesTab =
        activeTab === "all" ? true
        : activeTab === "payments" ? (c.type === "payment" || c.type === "platform")
        : activeTab === "logistics" ? c.type === "logistics"
        : activeTab === "providers" ? c.type === "provider"
        : activeTab === "retention" ? c.type === "retention"
        : activeTab === "ads" ? c.type === "ad_platform"
        : false;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, initialData]);

  const tabs: Array<{ label: string; value: TabValue; count: number; icon: React.ReactNode }> = [
    { label: "Todas", value: "all", count: tabCounts.all, icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "payments", count: tabCounts.payments, icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "Logística", value: "logistics", count: tabCounts.logistics, icon: <Truck className="h-3.5 w-3.5" /> },
    { label: "Proveedores", value: "providers", count: tabCounts.providers, icon: <Plug className="h-3.5 w-3.5" /> },
    { label: "Retención", value: "retention", count: tabCounts.retention, icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { label: "Publicidad", value: "ads", count: tabCounts.ads, icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Salud", value: "health", count: healthData.signals.length, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Integraciones.</h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
            Pagos, logística, proveedores, retención y publicidad. Todas las conexiones reales de tu tienda, con diagnóstico y acción correcta.
          </p>
        </div>
        {/* Header attention chip — reflects the honest count of items that
            aren't ready or absent; never a fabricated health score. */}
        {attentionCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 px-3 text-[12px] font-medium text-[color:var(--signal-warning)] hover:bg-[color:var(--signal-warning)]/15 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
          >
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            {attentionCount} {attentionCount === 1 ? "integración requiere atención" : "integraciones requieren atención"}
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="flex items-center gap-7 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn("group relative whitespace-nowrap py-4 text-[13px] font-medium transition-colors", activeTab === tab.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0")}
              onClick={() => setActiveTab(tab.value)}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
                <span className={cn("tabular inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] text-[10px] font-medium uppercase tracking-[0.14em]", activeTab === tab.value ? "bg-[var(--surface-2)] text-ink-0" : "bg-transparent text-ink-6 group-hover:bg-[var(--surface-2)]")}>{tab.count}</span>
              </span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ink-0" /> : null}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-6 group-focus-within:text-ink-0 transition-colors" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar integración…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-[13px] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] focus:bg-[var(--surface-0)]"
            />
          </div>
        </div>

        <div className="min-h-[400px] bg-[var(--surface-0)] p-6">
          {activeTab === "health" ? (
            <HealthCenter data={healthData} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="Sin integraciones en esta categoría"
              description="Todavía no hay conexiones que coincidan con este filtro. Cambiá de categoría o revisá qué falta por activar."
              action={{ label: "Ver todas", onClick: () => setActiveTab("all") }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <IntegrationCard key={c.id} connection={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── IntegrationCard ─────────────────────────────────────────────────────
// Rich per-integration card. Replaces the old logo + status-string layout.
// Every piece of text on the card maps to a real field on the
// UnifiedConnection: state drives the chip, metric is optional DB count,
// lastError surfaces only when the state is error or needs_reconnection,
// and the CTA is a real Link to the resolving module — never a no-op.

function IntegrationCard({ connection: c }: { connection: UnifiedConnection }) {
  const meta = describeState(c.state);
  const categoryIcon = categoryIconFor(c.type);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] p-5 transition-colors",
        meta.frame,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
            {categoryIcon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-ink-0">{c.name}</h3>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-ink-6">
              {categoryLabel(c.type)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 h-6 rounded-[var(--r-xs)] px-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
            meta.chipClass,
          )}
        >
          {meta.icon}
          {meta.label}
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-[1.5] text-ink-5">{c.description}</p>

      {/* Honest metric line — only rendered when the DB had a real value. */}
      {c.metric && (
        <p className="mt-3 text-[11px] font-mono text-ink-3">{c.metric}</p>
      )}

      {/* Error surfacing — only for real error / reconnection states. */}
      {c.lastError &&
        (c.state === "error" || c.state === "needs_reconnection") && (
          <p className="mt-3 rounded-[var(--r-xs)] border border-[color:var(--signal-danger)]/20 bg-[color:var(--signal-danger)]/5 px-2.5 py-1.5 text-[11px] leading-[1.5] text-[color:var(--signal-danger)]">
            {c.lastError}
          </p>
        )}

      <div className="mt-4 flex items-center justify-between border-t border-[color:var(--hairline)] pt-3 text-[11px] text-ink-6">
        <span>
          {c.lastSync
            ? `Último sync · ${new Date(c.lastSync).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}`
            : "Sin actividad registrada"}
        </span>
        <Link
          href={c.href}
          className={cn(
            "inline-flex items-center gap-1 font-medium transition-colors",
            meta.ctaClass,
          )}
        >
          {c.ctaLabel}
          <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}

// ─── State / category helpers ───────────────────────────────────────────

function describeState(state: IntegrationState): {
  label: string;
  icon: React.ReactNode;
  chipClass: string;
  frame: string;
  ctaClass: string;
} {
  switch (state) {
    case "ready":
      return {
        label: "Listo",
        icon: <CheckCircle2 className="h-3 w-3" strokeWidth={2} />,
        chipClass:
          "border border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]",
        frame: "border-[color:var(--hairline)]",
        ctaClass: "text-ink-0 hover:text-ink-2",
      };
    case "needs_setup":
      return {
        label: "Por configurar",
        icon: <Plug className="h-3 w-3" strokeWidth={1.75} />,
        chipClass:
          "border border-[color:var(--hairline)] bg-[var(--surface-2)] text-ink-3",
        frame: "border-[color:var(--hairline)]",
        ctaClass: "text-ink-0 hover:text-ink-2",
      };
    case "needs_reconnection":
      return {
        label: "Reconectar",
        icon: <RefreshCw className="h-3 w-3" strokeWidth={2} />,
        chipClass:
          "border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
        frame: "border-[color:var(--signal-danger)]/20",
        ctaClass:
          "text-[color:var(--signal-danger)] hover:text-[color:var(--signal-danger)]",
      };
    case "degraded":
      return {
        label: "Degradada",
        icon: <AlertTriangle className="h-3 w-3" strokeWidth={2} />,
        chipClass:
          "border border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
        frame: "border-[color:var(--signal-warning)]/20",
        ctaClass:
          "text-[color:var(--signal-warning)] hover:text-[color:var(--signal-warning)]",
      };
    case "error":
      return {
        label: "Error",
        icon: <AlertTriangle className="h-3 w-3" strokeWidth={2} />,
        chipClass:
          "border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
        frame: "border-[color:var(--signal-danger)]/20",
        ctaClass:
          "text-[color:var(--signal-danger)] hover:text-[color:var(--signal-danger)]",
      };
    case "not_installed":
    default:
      return {
        label: "No instalada",
        icon: <Plug className="h-3 w-3" strokeWidth={1.75} />,
        chipClass:
          "border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5",
        frame: "border-[color:var(--hairline)]",
        ctaClass: "text-ink-3 hover:text-ink-0",
      };
  }
}

function categoryIconFor(type: IntegrationCategory): React.ReactNode {
  switch (type) {
    case "payment":
    case "platform":
      return <CreditCard className="h-4 w-4" strokeWidth={1.75} />;
    case "logistics":
      return <Truck className="h-4 w-4" strokeWidth={1.75} />;
    case "provider":
      return <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />;
    case "retention":
      return <MessageSquare className="h-4 w-4" strokeWidth={1.75} />;
    case "ad_platform":
      return <Radio className="h-4 w-4" strokeWidth={1.75} />;
    default:
      return <Plug className="h-4 w-4" strokeWidth={1.75} />;
  }
}

function categoryLabel(type: IntegrationCategory): string {
  switch (type) {
    case "payment":
      return "Pagos";
    case "platform":
      return "Plataforma";
    case "logistics":
      return "Logística";
    case "provider":
      return "Sourcing";
    case "retention":
      return "Retención";
    case "ad_platform":
      return "Publicidad";
    default:
      return "Integración";
  }
}
