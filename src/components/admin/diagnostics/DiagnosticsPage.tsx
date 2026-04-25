import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Megaphone,
  Package,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  DiagnosticCategory,
  DiagnosticIssue,
  DiagnosticSeverity,
  DiagnosticSnapshot,
} from "@/lib/diagnostics/snapshot";

// ─── Diagnóstico — Estadísticas sub-surface ─────────────────────────────
//
// Pure presentational layer. Receives a fully-computed snapshot and
// renders three honest blocks:
//
//   1. Header pill — overall state and the *one* primary action.
//   2. Issue list — open issues sorted by severity, each with a CTA
//      that resolves it on its owning surface.
//   3. Resolved list — explicitly shown so the merchant can see what
//      already works and we don't pretend critical signals aren't real.
//
// No invented metrics, no "store score" out of 100. Just real counts
// of real problems with the real link to fix them.

interface DiagnosticsPageProps {
  snapshot: DiagnosticSnapshot;
}

const severityMeta: Record<
  DiagnosticSeverity,
  {
    label: string;
    icon: LucideIcon;
    pillClass: string;
    rowClass: string;
    iconClass: string;
  }
> = {
  critical: {
    label: "Crítico",
    icon: AlertTriangle,
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-danger)_14%,transparent)] text-[color:var(--signal-danger)] ring-[color:color-mix(in_srgb,var(--signal-danger)_28%,transparent)]",
    rowClass:
      "border-[color:color-mix(in_srgb,var(--signal-danger)_30%,var(--hairline))]",
    iconClass: "text-[color:var(--signal-danger)]",
  },
  high: {
    label: "Alto",
    icon: TriangleAlert,
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-warning)_16%,transparent)] text-[color:var(--signal-warning)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]",
    rowClass: "border-[color:var(--hairline)]",
    iconClass: "text-[color:var(--signal-warning)]",
  },
  normal: {
    label: "Recomendación",
    icon: Sparkles,
    pillClass: "bg-[var(--surface-2)] text-ink-3 ring-[color:var(--hairline)]",
    rowClass: "border-[color:var(--hairline)]",
    iconClass: "text-ink-4",
  },
  info: {
    label: "OK",
    icon: CheckCircle2,
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-success)_14%,transparent)] text-[color:var(--signal-success)] ring-[color:color-mix(in_srgb,var(--signal-success)_28%,transparent)]",
    rowClass: "border-[color:var(--hairline)]",
    iconClass: "text-[color:var(--signal-success)]",
  },
};

const categoryIcon: Record<DiagnosticCategory, LucideIcon> = {
  publication: Store,
  payments: CreditCard,
  catalog: Package,
  stock: Boxes,
  integrations: Megaphone,
  branding: ImageIcon,
  recommendation: Sparkles,
};

const categoryLabel: Record<DiagnosticCategory, string> = {
  publication: "Publicación",
  payments: "Pagos",
  catalog: "Catálogo",
  stock: "Stock",
  integrations: "Integraciones",
  branding: "Identidad visual",
  recommendation: "Recomendación",
};

const statusMeta: Record<
  DiagnosticSnapshot["status"],
  { label: string; copy: string; icon: LucideIcon; pillClass: string }
> = {
  blocked: {
    label: "Hay bloqueos críticos",
    copy: "Tu tienda tiene problemas que están impidiendo vender ahora mismo. Resolvé los críticos primero.",
    icon: AlertTriangle,
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-danger)_14%,transparent)] text-[color:var(--signal-danger)] ring-[color:color-mix(in_srgb,var(--signal-danger)_28%,transparent)]",
  },
  needs_attention: {
    label: "Hay puntos de atención",
    copy: "No hay nada roto, pero sí cosas que están afectando conversión o que conviene reforzar.",
    icon: TriangleAlert,
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-warning)_16%,transparent)] text-[color:var(--signal-warning)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]",
  },
  healthy: {
    label: "Tienda en orden",
    copy: "Ningún bloqueo crítico ni señal de conversión activa. Seguí monitoreando desde acá.",
    icon: ShieldCheck,
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-success)_14%,transparent)] text-[color:var(--signal-success)] ring-[color:color-mix(in_srgb,var(--signal-success)_28%,transparent)]",
  },
};

function IssueRow({ issue }: { issue: DiagnosticIssue }) {
  const meta = severityMeta[issue.severity];
  const SeverityIcon = meta.icon;
  const CategoryIcon = categoryIcon[issue.category];
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-[var(--r-md)] border bg-[var(--surface-0)] p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:gap-4 sm:p-5",
        meta.rowClass,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]",
        )}
      >
        <CategoryIcon className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] ring-1 ring-inset",
              meta.pillClass,
            )}
          >
            <SeverityIcon className={cn("h-3 w-3", meta.iconClass)} strokeWidth={2} />
            {meta.label}
          </span>
          <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-5">
            {categoryLabel[issue.category]}
          </span>
        </div>
        <p className="mt-1.5 text-[14px] font-semibold leading-[1.35] text-ink-0">
          {issue.title}
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-5">
          {issue.description}
        </p>
        {issue.detail && (
          <p className="mt-1.5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink-4">
            {issue.detail}
          </p>
        )}
      </div>

      <Link
        href={issue.href}
        className="inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] sm:self-auto"
      >
        {issue.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Link>
    </li>
  );
}

function ResolvedRow({ issue }: { issue: DiagnosticIssue }) {
  const CategoryIcon = categoryIcon[issue.category];
  return (
    <li className="flex items-center gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 py-2.5">
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-[color:var(--signal-success)]"
        strokeWidth={1.75}
      />
      <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-ink-4" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">
        {issue.title}
      </span>
      {issue.detail && (
        <span className="hidden text-[11px] uppercase tracking-[0.16em] text-ink-5 sm:inline">
          {issue.detail}
        </span>
      )}
    </li>
  );
}

export function DiagnosticsPage({ snapshot }: DiagnosticsPageProps) {
  const status = statusMeta[snapshot.status];
  const StatusIcon = status.icon;
  const hasOpen = snapshot.issues.length > 0;

  return (
    <div className="animate-in fade-in space-y-10 pb-32 duration-700">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
          <Stethoscope className="h-3.5 w-3.5" strokeWidth={1.75} />
          Estadísticas · Diagnóstico
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink-0 sm:text-[32px]">
              ¿Qué está bloqueando ventas hoy?
            </h1>
            <p className="max-w-2xl text-[13.5px] leading-[1.55] text-ink-5">
              Diagnóstico cruza la información que ya existe en tu tienda
              (publicación, pagos, catálogo, stock, integraciones) y te
              muestra los problemas reales con el atajo exacto para
              resolverlos. No hay scores inventados ni gráficas decorativas:
              solo lo que está pasando ahora.
            </p>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ring-inset",
              status.pillClass,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" strokeWidth={2} />
            {status.label}
          </span>
        </div>

        {/* ── Counts row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile
            label="Críticos"
            value={snapshot.counts.critical}
            tone="danger"
            icon={AlertTriangle}
          />
          <CountTile
            label="Atención"
            value={snapshot.counts.high}
            tone="warning"
            icon={TriangleAlert}
          />
          <CountTile
            label="Recomendaciones"
            value={snapshot.counts.normal}
            tone="muted"
            icon={Sparkles}
          />
          <CountTile
            label="En orden"
            value={snapshot.counts.resolved}
            tone="success"
            icon={CheckCircle2}
          />
        </div>

        {/* ── Primary action ───────────────────────────────────────── */}
        {snapshot.primaryAction && (
          <div className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-ink-12">
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
                  Por dónde empezar
                </p>
                <p className="mt-1 text-[14px] font-semibold text-ink-0">
                  {snapshot.primaryAction.label}
                </p>
              </div>
            </div>
            <Link
              href={snapshot.primaryAction.href}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[12.5px] font-semibold text-ink-12 transition-colors hover:bg-ink-2"
            >
              Resolver ahora
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        )}
      </header>

      {/* ── Open issues ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
              Problemas a resolver
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-5">
              Ordenados por severidad. Cada fila lleva al lugar exacto donde
              se corrige.
            </p>
          </div>
        </div>

        {hasOpen ? (
          <ul className="flex flex-col gap-3">
            {snapshot.issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-12 text-center">
            <ShieldCheck
              className="h-6 w-6 text-[color:var(--signal-success)]"
              strokeWidth={1.75}
            />
            <p className="text-[14px] font-semibold text-ink-0">
              Sin problemas detectados
            </p>
            <p className="max-w-sm text-[12.5px] leading-[1.5] text-ink-5">
              Diagnóstico no encontró bloqueos críticos, riesgos de conversión
              ni recomendaciones pendientes con los datos disponibles.
            </p>
          </div>
        )}
      </section>

      {/* ── Resolved ───────────────────────────────────────────────── */}
      {snapshot.resolved.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-ink-0">
              En orden
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-5">
              Cosas que ya están funcionando — las mostramos para que veas la
              foto completa, no solo lo que falta.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {snapshot.resolved.map((issue) => (
              <ResolvedRow key={issue.id} issue={issue} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Footer note ────────────────────────────────────────────── */}
      <footer className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4 text-[12px] leading-[1.55] text-ink-5">
        <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-5" strokeWidth={1.75} />
        <p>
          Diagnóstico se calcula a demanda con tu base real: perfil de tienda,
          conexión de Mercado Pago, productos publicados, stock por variante,
          integraciones de marketing y proveedores. No estimamos: si algo no
          está acá, es porque no hay señal real para mostrar.
        </p>
      </footer>
    </div>
  );
}

function CountTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "muted" | "success";
  icon: LucideIcon;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[color:var(--signal-danger)]"
      : tone === "warning"
        ? "text-[color:var(--signal-warning)]"
        : tone === "success"
          ? "text-[color:var(--signal-success)]"
          : "text-ink-3";
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3 shadow-[var(--shadow-soft)]">
      <Icon className={cn("h-4 w-4 shrink-0", toneClass)} strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-5">
          {label}
        </p>
        <p className={cn("mt-0.5 text-[20px] font-semibold leading-none tabular-nums", toneClass)}>
          {value}
        </p>
      </div>
    </div>
  );
}
