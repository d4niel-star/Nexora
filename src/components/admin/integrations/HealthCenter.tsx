"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Megaphone,
  Plug,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConnectionHealthEntry,
  HealthCenterData,
  HealthSignal,
  HealthSeverity,
  HealthStatus,
} from "@/types/health";

export function HealthCenter({ data }: { data: HealthCenterData }) {
  const { connections, signals, listings, overallHealth } = data;
  const hasConnections = connections.length > 0;
  const hasSignals = signals.length > 0;

  const criticals = signals.filter((s) => s.severity === "critical");
  const highs = signals.filter((s) => s.severity === "high");
  const normals = signals.filter((s) => s.severity === "normal" || s.severity === "info");

  return (
    <div className="space-y-8">
      {/* ─── Overall Health Banner ─── */}
      <OverallBanner health={overallHealth} signalCount={signals.length} connectionCount={connections.length} />

      {/* ─── Connections Strip ─── */}
      {hasConnections && (
        <section>
          <SectionLabel text="Estado de conexiones" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((c) => (
              <ConnectionCard key={c.id} conn={c} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Operational sync health (only if records exist) ─── */}
      {listings.total > 0 && (
        <section>
          <SectionLabel text="Sincronización operativa" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ListingChip label="Publicadas" value={listings.published} total={listings.total} />
            <ListingChip label="Sincronizadas" value={listings.synced} total={listings.total} color="emerald" />
            <ListingChip label="Desincronizadas" value={listings.outOfSync} total={listings.total} color={listings.outOfSync > 0 ? "amber" : undefined} />
            <ListingChip label="Con error" value={listings.syncError + listings.publishFailed} total={listings.total} color={listings.syncError + listings.publishFailed > 0 ? "red" : undefined} />
          </div>
        </section>
      )}

      {/* ─── Signals Queue ─── */}
      {hasSignals ? (
        <div className="space-y-6">
          {criticals.length > 0 && <SignalGroup signals={criticals} label="Requiere acción inmediata" severity="critical" />}
          {highs.length > 0 && <SignalGroup signals={highs} label="Prioridad alta" severity="high" />}
          {normals.length > 0 && <SignalGroup signals={normals} label="Atención recomendada" severity="normal" />}
        </div>
      ) : hasConnections ? (
        <AllClearState />
      ) : (
        <NoConnectionsState />
      )}

      {/* ─── Scope disclaimer ─── */}
      <ScopeBanner />
    </div>
  );
}

// ─── Sub-components ───

function OverallBanner({ health, signalCount, connectionCount }: { health: HealthStatus; signalCount: number; connectionCount: number }) {
  const config: Record<HealthStatus, { bg: string; border: string; icon: React.ReactNode; text: string; textColor: string }> = {
    healthy: {
      bg: "bg-emerald-50", border: "border-emerald-200",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
      text: "Todas las conexiones operativas. Sin señales de riesgo.",
      textColor: "text-emerald-800",
    },
    degraded: {
      bg: "bg-amber-50", border: "border-amber-200",
      icon: <ShieldAlert className="h-5 w-5 text-amber-600" />,
      text: `${signalCount} señal${signalCount !== 1 ? "es" : ""} de atención detectada${signalCount !== 1 ? "s" : ""} en ${connectionCount} conexión${connectionCount !== 1 ? "es" : ""}.`,
      textColor: "text-amber-800",
    },
    critical: {
      bg: "bg-red-50", border: "border-red-200",
      icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
      text: `Hay problemas críticos. ${signalCount} señal${signalCount !== 1 ? "es" : ""} requiere${signalCount === 1 ? "" : "n"} atención.`,
      textColor: "text-red-800",
    },
    unknown: {
      bg: "bg-gray-50", border: "border-[#EAEAEA]",
      icon: <Unplug className="h-5 w-5 text-gray-400" />,
      text: "No hay conexiones configuradas para monitorear.",
      textColor: "text-[#888888]",
    },
  };

  const c = config[health];

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-4", c.bg, c.border)}>
      {c.icon}
      <p className={cn("text-sm font-bold", c.textColor)}>{c.text}</p>
    </div>
  );
}

function ConnectionCard({ conn }: { conn: ConnectionHealthEntry }) {
  const healthStyles: Record<HealthStatus, string> = {
    healthy: "border-emerald-200 bg-emerald-50",
    degraded: "border-amber-200 bg-amber-50",
    critical: "border-red-200 bg-red-50",
    unknown: "border-[#EAEAEA] bg-gray-50",
  };

  const dotStyles: Record<HealthStatus, string> = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    critical: "bg-red-500",
    unknown: "bg-gray-400",
  };

  const tokenLabels: Record<ConnectionHealthEntry["tokenStatus"], { text: string; color: string }> = {
    ok: { text: "Token vigente", color: "text-emerald-600" },
    expiring_soon: { text: "Token por vencer", color: "text-amber-600" },
    expired: { text: "Token vencido", color: "text-red-600" },
    no_token: { text: "Sin token", color: "text-[#AAAAAA]" },
  };

  const tok = tokenLabels[conn.tokenStatus];

  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", healthStyles[conn.health])}>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60 border border-white/80">
          <ConnectionIcon type={conn.type} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#111111] truncate">{conn.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[conn.health])} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888888]">{conn.rawStatus}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium border-t border-black/5 pt-2 mt-2">
        <span className={cn("font-bold", tok.color)}>{tok.text}</span>
        <span className="text-[#AAAAAA]">
          {conn.lastActivity ? relativeTime(conn.lastActivity) : "Sin actividad"}
        </span>
      </div>
    </div>
  );
}

function ConnectionIcon({ type }: { type: ConnectionHealthEntry["type"] }) {
  const cls = "h-3.5 w-3.5 text-[#666666]";
  switch (type) {
    case "ad_platform": return <Megaphone className={cls} />;
    case "provider": return <Plug className={cls} />;
    default: return <Radio className={cls} />;
  }
}

function SignalGroup({ signals, label, severity }: { signals: HealthSignal[]; label: string; severity: HealthSeverity }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn(
          "h-2 w-2 rounded-full",
          severity === "critical" ? "bg-red-500" : severity === "high" ? "bg-amber-500" : "bg-gray-400"
        )} />
        <h3 className={cn(
          "text-[11px] font-bold uppercase tracking-[0.18em]",
          severity === "critical" ? "text-red-600" : severity === "high" ? "text-amber-600" : "text-[#888888]"
        )}>{label}</h3>
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          severity === "critical" ? "bg-red-100 text-red-700" : severity === "high" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
        )}>{signals.length}</span>
      </div>
      <div className="space-y-2">
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: HealthSignal }) {
  return (
    <Link
      href={signal.href}
      className={cn(
        "group flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
        signal.severity === "critical" ? "border-red-200 hover:border-red-300" :
        signal.severity === "high" ? "border-amber-200 hover:border-amber-300" :
        "border-[#EAEAEA] hover:border-gray-300"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        signal.severity === "critical" ? "bg-red-100" : signal.severity === "high" ? "bg-amber-100" : "bg-gray-100"
      )}>
        <ShieldAlert className={cn(
          "h-3.5 w-3.5",
          signal.severity === "critical" ? "text-red-600" : signal.severity === "high" ? "text-amber-600" : "text-[#888888]"
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[#111111]">{signal.title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#666666]">{signal.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-center text-[11px] font-bold text-[#AAAAAA] transition-colors group-hover:text-[#111111]">
        {signal.actionLabel} <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function ListingChip({ label, value, total, color }: { label: string; value: number; total: number; color?: string }) {
  const borderColor = color === "red" ? "border-red-200" : color === "amber" ? "border-amber-200" : color === "emerald" ? "border-emerald-200" : "border-[#EAEAEA]";
  const bgColor = color === "red" ? "bg-red-50" : color === "amber" ? "bg-amber-50" : color === "emerald" ? "bg-emerald-50" : "bg-white";
  const valueColor = color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : color === "emerald" ? "text-emerald-700" : "text-[#111111]";

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm", borderColor, bgColor)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888888]">{label}</p>
      <p className={cn("mt-0.5 text-lg font-black tabular-nums", valueColor)}>
        {value} <span className="text-xs font-bold text-[#CCCCCC]">/ {total}</span>
      </p>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{text}</h2>
  );
}

function AllClearState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-12 text-center">
      <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-3" />
      <h3 className="text-base font-extrabold text-[#111111]">Sin señales de riesgo</h3>
      <p className="mt-1 text-xs font-medium text-[#888888]">
        Todas las conexiones están operativas. No hay problemas de sincronización.
      </p>
    </div>
  );
}

function NoConnectionsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEAEA] bg-white p-12 text-center">
      <Unplug className="h-8 w-8 text-gray-300 mb-3" />
      <h3 className="text-base font-extrabold text-[#111111]">No hay conexiones configuradas</h3>
      <p className="mt-1 max-w-sm text-xs font-medium text-[#888888]">
        El monitoreo de salud se activa cuando existen plataformas de ads o proveedores conectados.
      </p>
      <Link
        href="/admin/sourcing"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-black"
      >
        Conectar proveedor <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function ScopeBanner() {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 shadow-sm">
      <p className="text-sm font-bold text-[#111111]">Health Center v1</p>
      <p className="mt-1 text-xs leading-relaxed text-[#666666]">
        Monitorea estado de conexiones OAuth, expiracion de tokens y sincronizacion
        de proveedores. No incluye retry automatico ni refresh de tokens; esas capacidades
        serán parte de v2.
      </p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
