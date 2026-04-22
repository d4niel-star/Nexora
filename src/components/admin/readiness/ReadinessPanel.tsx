import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  ReadinessCheck,
  ReadinessSeverity,
  ReadinessSnapshot,
} from "@/lib/readiness/snapshot";

// ─── Readiness panel v2 ──────────────────────────────────────────────────
// Compact "control center" surface. Architecture:
//
//   ┌──────────────────────────────────────────────────────┐
//   │ [status chip]  Headline           [CTA button]       │  ← single bar
//   │ bloqueantes:2  riesgos:1  mejoras:0  resueltos:4     │
//   └──────────────────────────────────────────────────────┘
//   ┌─────────────────────────┬────────────────────────────┐
//   │ BLOQUEANTES (2)         │ RIESGOS (1)                │  ← 2-col grid
//   │  ○ Item 1        [→]   │  ○ Item 1          [→]    │
//   │  ○ Item 2        [→]   │                            │
//   │                         │ MEJORAS (0)                │
//   │                         │  — Sin mejoras pendientes  │
//   └─────────────────────────┴────────────────────────────┘
//
// Mobile: stacks vertically but remains compact.
// - ~50% less vertical space than v1
// - Better horizontal usage on desktop
// - Same information density, better scannability

export function ReadinessPanel({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const unresolved = snapshot.checks.filter((c) => !c.resolved);
  const resolved = snapshot.checks.filter((c) => c.resolved);

  const blockers = unresolved.filter(
    (c) =>
      c.severity === "blocks_publication" || c.severity === "blocks_sales",
  );
  const risks = unresolved.filter(
    (c) => c.severity === "blocks_conversion",
  );
  const improvements = unresolved.filter(
    (c) => c.severity === "recommendation",
  );

  const hasContent = blockers.length > 0 || risks.length > 0 || improvements.length > 0;

  return (
    <section className="space-y-3">
      {/* ── Compact header bar ──────────────────────────────── */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <StatusChip status={snapshot.status} />
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">
                {describeHeadline(snapshot)}
              </h2>
            </div>
            <MetricStrip snapshot={snapshot} resolvedCount={resolved.length} />
          </div>
          <Link
            href={snapshot.primaryAction.href}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
          >
            {snapshot.primaryAction.label}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────────── */}
      {hasContent && (
        <div className={cn(
          "grid gap-3",
          blockers.length > 0 && (risks.length > 0 || improvements.length > 0)
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1",
        )}>
          {/* Left: Blockers (or solo risks if no blockers) */}
          {blockers.length > 0 ? (
            <CheckColumn title="Bloqueantes" tone="critical" checks={blockers} />
          ) : risks.length > 0 ? (
            <CheckColumn title="Riesgos" tone="warning" checks={risks} />
          ) : null}

          {/* Right: Risks + Improvements (only when blockers exist) */}
          {blockers.length > 0 && (risks.length > 0 || improvements.length > 0) && (
            <div className="flex flex-col gap-3">
              {risks.length > 0 && (
                <CheckColumn title="Riesgos" tone="warning" checks={risks} />
              )}
              {improvements.length > 0 && (
                <CheckColumn title="Mejoras" tone="neutral" checks={improvements} />
              )}
            </div>
          )}

          {/* Solo improvements (no blockers, no risks) */}
          {blockers.length === 0 && risks.length === 0 && improvements.length > 0 && (
            <CheckColumn title="Mejoras" tone="neutral" checks={improvements} />
          )}
        </div>
      )}

      {/* ── All resolved (no unresolved checks) ─────────────── */}
      {!hasContent && resolved.length > 0 && (
        <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-[color:var(--signal-success)]" strokeWidth={1.75} />
          <span className="text-[12px] text-ink-3">
            Todos los checks resueltos — tu tienda está lista para operar.
          </span>
        </div>
      )}
    </section>
  );
}

// ─── Status chip (inline) ──────────────────────────────────────────────

function StatusChip({ status }: { status: ReadinessSnapshot["status"] }) {
  const meta: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    blocked: {
      label: "Bloqueada",
      icon: <ShieldAlert className="h-3 w-3" strokeWidth={2} />,
      cls: "border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
    },
    ready_with_warnings: {
      label: "Con advertencias",
      icon: <AlertTriangle className="h-3 w-3" strokeWidth={2} />,
      cls: "border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
    },
    ready: {
      label: "Lista",
      icon: <CheckCircle2 className="h-3 w-3" strokeWidth={2} />,
      cls: "border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]",
    },
  };
  const m = meta[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-[var(--r-full)] border px-2 text-[9px] font-semibold uppercase tracking-[0.14em]",
        m.cls,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

// ─── Headline text ─────────────────────────────────────────────────────

function describeHeadline(snapshot: ReadinessSnapshot): string {
  if (snapshot.status === "blocked") {
    return snapshot.publicationBlockers > 0
      ? "Tu tienda no puede salir al aire."
      : "Tu tienda no puede recibir pagos.";
  }
  if (snapshot.status === "ready_with_warnings") {
    return "Puede publicarse y cobrar, con riesgos operativos.";
  }
  return "Tu tienda está lista para operar.";
}

// ─── Metric strip (inline badges) ──────────────────────────────────────

function MetricStrip({
  snapshot,
  resolvedCount,
}: {
  snapshot: ReadinessSnapshot;
  resolvedCount: number;
}) {
  const items: Array<{
    label: string;
    count: number;
    tone: "critical" | "warning" | "neutral" | "success";
  }> = [
    {
      label: "Bloqueantes",
      count: snapshot.publicationBlockers + snapshot.salesBlockers,
      tone: "critical",
    },
    { label: "Riesgos", count: snapshot.conversionWarnings, tone: "warning" },
    { label: "Mejoras", count: snapshot.recommendations, tone: "neutral" },
    { label: "Resueltos", count: resolvedCount, tone: "success" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className={cn(
              "inline-flex h-4 min-w-[16px] items-center justify-center rounded-[3px] px-1 text-[10px] font-semibold tabular-nums",
              item.tone === "critical" &&
                "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
              item.tone === "warning" &&
                "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
              item.tone === "neutral" && "bg-[var(--surface-2)] text-ink-3",
              item.tone === "success" &&
                "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]",
              item.count === 0 && "opacity-50",
            )}
          >
            {item.count}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Check column (compact card) ───────────────────────────────────────

function CheckColumn({
  title,
  tone,
  checks,
}: {
  title: string;
  tone: "critical" | "warning" | "neutral";
  checks: ReadinessCheck[];
}) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
      {/* Section label — ultra compact */}
      <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-[0.16em]",
              tone === "critical" && "text-[color:var(--signal-danger)]",
              tone === "warning" && "text-[color:var(--signal-warning)]",
              tone === "neutral" && "text-ink-4",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "inline-flex h-4 min-w-[16px] items-center justify-center rounded-[3px] px-1 text-[10px] font-semibold tabular-nums",
              tone === "critical" &&
                "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
              tone === "warning" &&
                "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
              tone === "neutral" && "bg-[var(--surface-2)] text-ink-3",
            )}
          >
            {checks.length}
          </span>
        </div>
      </div>
      {/* Check rows — compact */}
      <ul className="divide-y divide-[color:var(--hairline)]">
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} tone={tone} />
        ))}
      </ul>
    </div>
  );
}

// ─── Check row (dense) ─────────────────────────────────────────────────

function CheckRow({
  check,
  tone,
}: {
  check: ReadinessCheck;
  tone: "critical" | "warning" | "neutral";
}) {
  return (
    <li className="group">
      <Link
        href={check.href}
        className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-1)] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
      >
        {/* Compact icon */}
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-xs)] border",
            tone === "critical" &&
              "border-[color:var(--signal-danger)]/25 bg-[color:var(--signal-danger)]/8 text-[color:var(--signal-danger)]",
            tone === "warning" &&
              "border-[color:var(--signal-warning)]/25 bg-[color:var(--signal-warning)]/8 text-[color:var(--signal-warning)]",
            tone === "neutral" &&
              "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4",
          )}
        >
          {severityIcon(check.severity)}
        </span>
        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-medium text-ink-0">
              {check.title}
            </p>
            <SeverityChip severity={check.severity} />
          </div>
          {check.detail && (
            <p className="mt-0.5 text-[10px] font-mono text-ink-4">
              {check.detail}
            </p>
          )}
        </div>
        {/* CTA */}
        <span className="hidden shrink-0 items-center gap-0.5 text-[11px] text-ink-4 group-hover:text-ink-0 md:inline-flex">
          {check.ctaLabel}
          <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
        </span>
      </Link>
    </li>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function severityIcon(severity: ReadinessSeverity): React.ReactNode {
  if (severity === "blocks_publication" || severity === "blocks_sales") {
    return <ShieldAlert className="h-3 w-3" strokeWidth={1.75} />;
  }
  if (severity === "blocks_conversion") {
    return <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />;
  }
  return <Sparkles className="h-3 w-3" strokeWidth={1.75} />;
}

function SeverityChip({ severity }: { severity: ReadinessSeverity }) {
  const map: Record<ReadinessSeverity, { label: string; cls: string }> = {
    blocks_publication: {
      label: "Publicar",
      cls: "bg-[color:var(--signal-danger)]/12 text-[color:var(--signal-danger)]",
    },
    blocks_sales: {
      label: "Cobrar",
      cls: "bg-[color:var(--signal-danger)]/12 text-[color:var(--signal-danger)]",
    },
    blocks_conversion: {
      label: "Conversión",
      cls: "bg-[color:var(--signal-warning)]/12 text-[color:var(--signal-warning)]",
    },
    recommendation: {
      label: "Mejora",
      cls: "bg-[var(--surface-2)] text-ink-4",
    },
  };
  const meta = map[severity];
  return (
    <span
      className={cn(
        "inline-flex h-3.5 items-center rounded-[3px] px-1 text-[8px] font-semibold uppercase tracking-[0.08em]",
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  );
}