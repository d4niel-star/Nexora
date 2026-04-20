import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  ReadinessCheck,
  ReadinessSeverity,
  ReadinessSnapshot,
} from "@/lib/readiness/snapshot";

// ─── Readiness panel ─────────────────────────────────────────────────────
// Sober, executive surface that turns a ReadinessSnapshot into a three-
// section decision tree:
//
//   1. Header      → module-level status chip + primary CTA (first blocker)
//   2. Bloqueantes → blocks_publication + blocks_sales (shown first)
//   3. Riesgos     → blocks_conversion
//   4. Mejoras     → recommendation
//
// Resolved checks don't get their own section; they collapse into a
// compact "X checks OK" footer so the surface stays focused on what's
// left to do. No invented scores, no fabricated progress bars.

export function ReadinessPanel({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const unresolved = snapshot.checks.filter((c) => !c.resolved);
  const resolved = snapshot.checks.filter((c) => c.resolved);

  const publicationAndSalesBlockers = unresolved.filter(
    (c) =>
      c.severity === "blocks_publication" || c.severity === "blocks_sales",
  );
  const conversionWarnings = unresolved.filter(
    (c) => c.severity === "blocks_conversion",
  );
  const recommendations = unresolved.filter(
    (c) => c.severity === "recommendation",
  );

  return (
    <section className="space-y-6">
      <ReadinessHeader snapshot={snapshot} />

      {publicationAndSalesBlockers.length > 0 && (
        <ChecksSection
          title="Bloqueantes"
          description={
            snapshot.publicationBlockers > 0 && snapshot.salesBlockers > 0
              ? "Impiden publicar y cobrar. Resolvé primero estos."
              : snapshot.publicationBlockers > 0
                ? "Impiden que la tienda salga al aire."
                : "La tienda puede estar pública pero no puede cobrar."
          }
          tone="critical"
          checks={publicationAndSalesBlockers}
        />
      )}

      {conversionWarnings.length > 0 && (
        <ChecksSection
          title="Riesgos operativos"
          description="La tienda puede vender, pero la conversión va a sufrir."
          tone="warning"
          checks={conversionWarnings}
        />
      )}

      {recommendations.length > 0 && (
        <ChecksSection
          title="Recomendaciones"
          description="Útiles pero no bloquean ventas."
          tone="neutral"
          checks={recommendations}
        />
      )}

      {resolved.length > 0 && (
        <ResolvedFooter count={resolved.length} />
      )}
    </section>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function ReadinessHeader({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const statusMeta = describeStatus(snapshot);

  return (
    <header className="flex flex-col gap-5 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-[var(--r-full)] border px-2.5 text-[10px] font-medium uppercase tracking-[0.18em]",
              statusMeta.chipClass,
            )}
          >
            {statusMeta.icon}
            {statusMeta.label}
          </span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink-0">
          {statusMeta.headline}
        </h2>
        <p className="max-w-xl text-[13px] leading-[1.55] text-ink-5">
          {statusMeta.description}
        </p>
        <CountStrip snapshot={snapshot} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={snapshot.primaryAction.href}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
        >
          {snapshot.primaryAction.label}
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}

function describeStatus(snapshot: ReadinessSnapshot): {
  label: string;
  headline: string;
  description: string;
  icon: React.ReactNode;
  chipClass: string;
} {
  if (snapshot.status === "blocked") {
    return {
      label:
        snapshot.publicationBlockers > 0
          ? "Bloqueada para publicar"
          : "Bloqueada para cobrar",
      headline:
        snapshot.publicationBlockers > 0
          ? "Tu tienda todavía no puede salir al aire."
          : "Tu tienda no puede recibir pagos.",
      description:
        snapshot.publicationBlockers + snapshot.salesBlockers === 1
          ? "Hay un bloqueante por resolver antes de operar."
          : `Hay ${snapshot.publicationBlockers + snapshot.salesBlockers} bloqueantes por resolver antes de operar.`,
      icon: <ShieldAlert className="h-3 w-3" strokeWidth={2} />,
      chipClass:
        "border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
    };
  }
  if (snapshot.status === "ready_with_warnings") {
    return {
      label: "Lista con advertencias",
      headline: "Tu tienda puede publicarse y cobrar.",
      description:
        "Resolvé los riesgos operativos para mejorar la conversión antes de traer tráfico pago.",
      icon: <AlertTriangle className="h-3 w-3" strokeWidth={2} />,
      chipClass:
        "border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
    };
  }
  return {
    label: "Lista",
    headline: "Tu tienda está lista para operar.",
    description:
      "Sin bloqueantes ni riesgos detectados. Podés enfocar energía en crecimiento.",
    icon: <CheckCircle2 className="h-3 w-3" strokeWidth={2} />,
    chipClass:
      "border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]",
  };
}

function CountStrip({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const items: Array<{ label: string; count: number; tone: "critical" | "warning" | "neutral" }> = [
    {
      label: "Bloqueantes",
      count: snapshot.publicationBlockers + snapshot.salesBlockers,
      tone: "critical",
    },
    { label: "Riesgos", count: snapshot.conversionWarnings, tone: "warning" },
    { label: "Mejoras", count: snapshot.recommendations, tone: "neutral" },
  ];
  return (
    <div className="mt-1 flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-5 min-w-[20px] items-center justify-center rounded-[var(--r-xs)] px-1.5 text-[11px] font-semibold tabular-nums",
              item.tone === "critical" &&
                "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
              item.tone === "warning" &&
                "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
              item.tone === "neutral" && "bg-[var(--surface-2)] text-ink-3",
              item.count === 0 && "opacity-50",
            )}
          >
            {item.count}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────

function ChecksSection({
  title,
  description,
  tone,
  checks,
}: {
  title: string;
  description: string;
  tone: "critical" | "warning" | "neutral";
  checks: ReadinessCheck[];
}) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
      <header className="flex items-start justify-between border-b border-[color:var(--hairline)] px-6 py-4">
        <div>
          <p
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.18em]",
              tone === "critical" && "text-[color:var(--signal-danger)]",
              tone === "warning" && "text-[color:var(--signal-warning)]",
              tone === "neutral" && "text-ink-5",
            )}
          >
            {title}
          </p>
          <h3 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
            {description}
          </h3>
        </div>
        <span className="mt-1 inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {checks.length}
        </span>
      </header>
      <ul className="divide-y divide-[color:var(--hairline)]">
        {checks.map((check, index) => (
          <CheckRow key={check.id} index={index} check={check} tone={tone} />
        ))}
      </ul>
    </div>
  );
}

function CheckRow({
  index,
  check,
  tone,
}: {
  index: number;
  check: ReadinessCheck;
  tone: "critical" | "warning" | "neutral";
}) {
  return (
    <li className="group">
      <Link
        href={check.href}
        className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-[var(--surface-1)] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border",
            tone === "critical" &&
              "border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
            tone === "warning" &&
              "border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
            tone === "neutral" &&
              "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3",
          )}
        >
          {severityIcon(check.severity)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-ink-6 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="truncate text-[13px] font-medium text-ink-0">
              {check.title}
            </p>
            <SeverityChip severity={check.severity} />
          </div>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-5">
            {check.description}
          </p>
          {check.detail && (
            <p className="mt-1 text-[11px] font-mono text-ink-3">
              {check.detail}
            </p>
          )}
        </div>
        <span className="hidden shrink-0 items-center gap-1 text-[12px] text-ink-3 group-hover:text-ink-0 md:inline-flex">
          {check.ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </Link>
    </li>
  );
}

function severityIcon(severity: ReadinessSeverity): React.ReactNode {
  if (severity === "blocks_publication" || severity === "blocks_sales") {
    return <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />;
  }
  if (severity === "blocks_conversion") {
    return <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />;
  }
  return <Sparkles className="h-4 w-4" strokeWidth={1.75} />;
}

function SeverityChip({ severity }: { severity: ReadinessSeverity }) {
  const map: Record<ReadinessSeverity, { label: string; cls: string }> = {
    blocks_publication: {
      label: "Publicar",
      cls: "bg-[color:var(--signal-danger)]/15 text-[color:var(--signal-danger)]",
    },
    blocks_sales: {
      label: "Cobrar",
      cls: "bg-[color:var(--signal-danger)]/15 text-[color:var(--signal-danger)]",
    },
    blocks_conversion: {
      label: "Conversión",
      cls: "bg-[color:var(--signal-warning)]/15 text-[color:var(--signal-warning)]",
    },
    recommendation: {
      label: "Mejora",
      cls: "bg-[var(--surface-2)] text-ink-3",
    },
  };
  const meta = map[severity];
  return (
    <span
      className={cn(
        "inline-flex h-4 items-center rounded-[var(--r-xs)] px-1.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  );
}

// ─── Resolved footer ─────────────────────────────────────────────────────

function ResolvedFooter({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-ink-5">
      <Circle className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2} />
      <span>
        {count} {count === 1 ? "check resuelto" : "checks resueltos"}
      </span>
    </div>
  );
}
