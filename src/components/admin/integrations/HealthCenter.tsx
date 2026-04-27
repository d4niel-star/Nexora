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
  const config: Record<HealthStatus, { icon: React.ReactNode; text: string; tone: string }> = {
    healthy: {
      icon: <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />,
      text: "Todas las conexiones operativas. Sin señales de riesgo.",
      tone: "text-[color:var(--signal-success)]",
    },
    degraded: {
      icon: <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />,
      text: `${signalCount} señal${signalCount !== 1 ? "es" : ""} de atención detectada${signalCount !== 1 ? "s" : ""} en ${connectionCount} conexión${connectionCount !== 1 ? "es" : ""}.`,
      tone: "text-[color:var(--signal-warning)]",
    },
    critical: {
      icon: <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />,
      text: `Hay problemas críticos. ${signalCount} señal${signalCount !== 1 ? "es" : ""} requiere${signalCount === 1 ? "" : "n"} atención.`,
      tone: "text-[color:var(--signal-danger)]",
    },
    unknown: {
      icon: <Unplug className="h-4 w-4" strokeWidth={1.75} />,
      text: "No hay conexiones configuradas para monitorear.",
      tone: "text-ink-5",
    },
  };

  const c = config[health];

  return (
    <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <span className={c.tone}>{c.icon}</span>
      <p className={cn("text-[13px] font-medium leading-[1.5]", c.tone)}>{c.text}</p>
    </div>
  );
}

function ConnectionCard({ conn }: { conn: ConnectionHealthEntry }) {
  const dotStyles: Record<HealthStatus, string> = {
    healthy: "bg-[color:var(--signal-success)]",
    degraded: "bg-[color:var(--signal-warning)]",
    critical: "bg-[color:var(--signal-danger)]",
    unknown: "bg-[var(--surface-3)]",
  };

  const tokenLabels: Record<ConnectionHealthEntry["tokenStatus"], { text: string; color: string }> = {
    ok: { text: "Token vigente", color: "text-[color:var(--signal-success)]" },
    expiring_soon: { text: "Token por vencer", color: "text-[color:var(--signal-warning)]" },
    expired: { text: "Token vencido", color: "text-[color:var(--signal-danger)]" },
    no_token: { text: "Sin token", color: "text-ink-6" },
  };

  const tok = tokenLabels[conn.tokenStatus];

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)]">
          <ConnectionIcon type={conn.type} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-0 truncate">{conn.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[conn.health])} />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{conn.rawStatus}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium border-t border-[color:var(--hairline)] pt-2 mt-2">
        <span className={tok.color}>{tok.text}</span>
        <span className="text-ink-6">
          {conn.lastActivity ? relativeTime(conn.lastActivity) : "Sin actividad"}
        </span>
      </div>
    </div>
  );
}

function ConnectionIcon({ type }: { type: ConnectionHealthEntry["type"] }) {
  const cls = "h-3.5 w-3.5 text-ink-5";
  switch (type) {
    case "ad_platform": return <Megaphone className={cls} strokeWidth={1.75} />;
    case "provider": return <Plug className={cls} strokeWidth={1.75} />;
    default: return <Radio className={cls} strokeWidth={1.75} />;
  }
}

function SignalGroup({ signals, label, severity }: { signals: HealthSignal[]; label: string; severity: HealthSeverity }) {
  const tone = severity === "critical"
    ? "text-[color:var(--signal-danger)]"
    : severity === "high"
      ? "text-[color:var(--signal-warning)]"
      : "text-ink-5";
  const dot = severity === "critical"
    ? "bg-[color:var(--signal-danger)]"
    : severity === "high"
      ? "bg-[color:var(--signal-warning)]"
      : "bg-[var(--surface-3)]";
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        <h3 className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", tone)}>{label}</h3>
        <span className={cn("inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[10px] font-medium tabular", tone)}>{signals.length}</span>
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
  const iconTone = signal.severity === "critical"
    ? "text-[color:var(--signal-danger)]"
    : signal.severity === "high"
      ? "text-[color:var(--signal-warning)]"
      : "text-ink-5";
  return (
    <Link
      href={signal.href}
      className="group flex items-start gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 transition-colors hover:bg-[var(--surface-2)]"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <ShieldAlert className={cn("h-3.5 w-3.5", iconTone)} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink-0">{signal.title}</p>
        <p className="mt-0.5 text-[11px] leading-[1.55] text-ink-5">{signal.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-center text-[11px] font-medium text-ink-6 transition-colors group-hover:text-ink-0">
        {signal.actionLabel} <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
      </div>
    </Link>
  );
}

function ListingChip({ label, value, total, color }: { label: string; value: number; total: number; color?: string }) {
  const valueColor = color === "red"
    ? "text-[color:var(--signal-danger)]"
    : color === "amber"
      ? "text-[color:var(--signal-warning)]"
      : color === "emerald"
        ? "text-[color:var(--signal-success)]"
        : "text-ink-0";

  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className={cn("mt-1 text-[18px] font-semibold tracking-[-0.02em] tabular-nums", valueColor)}>
        {value} <span className="text-[11px] font-medium text-ink-6">/ {total}</span>
      </p>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">{text}</h2>
  );
}

function AllClearState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-12 text-center">
      <CheckCircle2 className="h-5 w-5 text-[color:var(--signal-success)] mb-3" strokeWidth={1.75} />
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">Sin señales de riesgo.</h3>
      <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
        Todas las conexiones están operativas. No hay problemas de sincronización.
      </p>
    </div>
  );
}

function NoConnectionsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-12 text-center">
      <Unplug className="h-5 w-5 text-ink-5 mb-3" strokeWidth={1.5} />
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">No hay conexiones configuradas.</h3>
      <p className="mt-1 max-w-sm text-[12px] leading-[1.55] text-ink-5">
        El monitoreo de salud se activa cuando existen plataformas de ads o proveedores conectados.
      </p>
      <Link
        href="/admin/sourcing"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
      >
        Conectar proveedor <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

function ScopeBanner() {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <p className="text-[13px] font-medium text-ink-0">Health Center v1</p>
      <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
        Monitorea estado de conexiones OAuth, expiración de tokens y sincronización
        de proveedores. No incluye retry automático ni refresh de tokens; esas capacidades
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
