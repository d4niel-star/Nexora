"use client";

import Link from "next/link";
import { MerchantOnboardingGuide } from "./MerchantOnboardingGuide";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  CircleDollarSign,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import type {
  CommandCenterData,
  CommandDirective,
  CommandDomain,
  CommandPriority,
} from "@/types/command-center";
import { buildVariantHref } from "@/lib/navigation/hrefs";
import {
  NexoraPageHeader,
  NexoraStatRow,
  NexoraPanel,
  NexoraEmpty,
} from "@/components/admin/nexora";

// ─── Command Center · Studio v4 ─────────────────────────────────────────
//
// Composition rebuilt from the ground up to use the Nexora Studio v4
// primitives. The visual change is structural, not cosmetic:
//
//   · One flat hairline-divided stat row replaces the 6 separate KPI
//     tiles. Critical / hidden-risk variants become click targets that
//     route straight into inventory at the offending variant.
//   · Directive groups become two columns of flat .nx-panel cards (no
//     shadow). Each row is a hairline-separated link, not a chip-stuffed
//     card.
//   · The empty state is a single short message inside a panel, not a
//     360px illustration card.

export function CommandCenter({ data }: { data: CommandCenterData }) {
  const router = useRouter();
  const { directives, kpis } = data;
  const hasDirectives = directives.length > 0;

  const criticals = directives.filter((d) => d.priority === "critical");
  const highs = directives.filter((d) => d.priority === "high");
  const mediums = directives.filter((d) => d.priority === "medium");
  const lows = directives.filter((d) => d.priority === "low");

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  // Build a single 6-up flat stat row. Critical-variant stats are
  // clickable when there is a variant to deep-link to.
  const stats = [
    {
      label: "Revenue 30d",
      value: formatCurrency(kpis.revenue30d),
    },
    {
      label: "Unidades 30d",
      value: String(kpis.unitsSold30d),
    },
    {
      label: "Margen neto",
      value: kpis.avgMarginPercent !== null ? `${kpis.avgMarginPercent}%` : "—",
      hint:
        kpis.avgMarginPercent !== null && kpis.avgMarginPercent < 15
          ? "Bajo objetivo"
          : undefined,
    },
    {
      label: "Stock crítico",
      value: String(kpis.criticalStock),
    },
    {
      label: "Variantes críticas",
      value: String(kpis.criticalVariants),
      hint: kpis.firstCriticalVariantId ? "Ver variante" : undefined,
      onClick: kpis.firstCriticalVariantId
        ? () =>
            router.push(buildVariantHref(kpis.firstCriticalVariantId!, "adjust"))
        : undefined,
    },
    {
      label: "Riesgo oculto",
      value: String(kpis.hiddenVariantRiskProducts),
      hint: kpis.firstHiddenVariantId ? "Ver variante" : undefined,
      onClick: kpis.firstHiddenVariantId
        ? () => router.push(buildVariantHref(kpis.firstHiddenVariantId!))
        : undefined,
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <NexoraPageHeader
        title="Panel de control"
        subtitle="Decisiones priorizadas hoy, sobre datos reales de ventas, margen, stock y operación."
      />

      <div className="space-y-6">
        {/* Flat KPI band — one hairline frame, vertical hairlines between */}
        <NexoraStatRow stats={stats} cols={6} />

        {/* Readiness checklist */}
        <MerchantOnboardingGuide />

        {/* Directive groups (or empty state) */}
        {hasDirectives ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {criticals.length > 0 && (
              <DirectiveGroup directives={criticals} label="Acción inmediata" priority="critical" />
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
          <NexoraPanel>
            <NexoraEmpty
              title="Sin decisiones pendientes"
              body="No hay acciones comerciales urgentes. Cuando algo requiera atención, aparecerá acá automáticamente."
              actions={
                <>
                  <Link href="/admin/catalog" className="nx-action nx-action--sm">
                    Ir al catálogo
                  </Link>
                  <Link
                    href="/admin/finances?tab=rentabilidad"
                    className="nx-action nx-action--sm"
                  >
                    Revisar márgenes
                  </Link>
                </>
              }
            />
          </NexoraPanel>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

const PRIORITY_DOT: Record<CommandPriority, string> = {
  critical: "var(--signal-danger)",
  high: "var(--signal-warning)",
  medium: "var(--accent-500)",
  low: "var(--ink-6)",
};

function DirectiveGroup({
  directives,
  label,
  priority,
}: {
  directives: CommandDirective[];
  label: string;
  priority: CommandPriority;
}) {
  return (
    <NexoraPanel
      flush
      title={
        // Title slot accepts ReactNode via children of the helper, but we
        // keep it a plain label here — the count chip rides next to it.
        label
      }
      actions={
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--ink-5)",
          }}
        >
          {directives.length} {directives.length === 1 ? "acción" : "acciones"}
        </span>
      }
    >
      {/* Header dot — rendered as a thin band on the panel, anchored
          via the title row by inserting an inline span here. We can't
          inject above the panel header without breaking the API, so we
          use a leading 2px tinted edge on the body container. */}
      <div
        style={{
          position: "relative",
          // 2px colored edge so each priority group reads at a glance
          // without recreating the header in HTML.
          boxShadow: `inset 2px 0 0 ${PRIORITY_DOT[priority]}`,
        }}
      >
        <ul>
          {directives.map((d, i) => (
            <li
              key={d.id}
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--studio-line)",
              }}
            >
              <DirectiveRow directive={d} />
            </li>
          ))}
        </ul>
      </div>
    </NexoraPanel>
  );
}

function DirectiveRow({ directive }: { directive: CommandDirective }) {
  const d = directive;

  return (
    <Link
      href={d.href}
      className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--studio-row-hover)]"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--studio-canvas)]">
        <DomainIcon domain={d.domain} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-ink-0">{d.title}</p>
          {d.productCount && d.productCount > 0 ? (
            <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-[var(--studio-canvas)] px-1.5 text-[10.5px] font-medium tabular-nums text-ink-5">
              {d.productCount} SKU{d.productCount !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-5">{d.reason}</p>
        {d.evidence ? (
          <p className="mt-0.5 text-[11.5px] italic text-ink-6">{d.evidence}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-center text-[11.5px] font-medium text-ink-5 transition-colors group-hover:text-ink-0">
        {d.actionLabel}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
    </Link>
  );
}

function DomainIcon({ domain }: { domain: CommandDomain }) {
  const cls = "h-3.5 w-3.5 text-ink-3";
  switch (domain) {
    case "revenue":
      return <TrendingUp className={cls} strokeWidth={1.75} />;
    case "margin":
      return <CircleDollarSign className={cls} strokeWidth={1.75} />;
    case "stock":
      return <Box className={cls} strokeWidth={1.75} />;
    case "sourcing":
      return <Truck className={cls} strokeWidth={1.75} />;
    case "operations":
      return <ShoppingCart className={cls} strokeWidth={1.75} />;
    default:
      return <Sparkles className={cls} strokeWidth={1.75} />;
  }
}
