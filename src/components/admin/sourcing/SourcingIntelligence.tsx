"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  Package,
  PackageX,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportableProduct, SourcingIntelData, SourcingReadiness } from "@/types/sourcing-intel";

export function SourcingIntelligence({ data }: { data: SourcingIntelData }) {
  const { products, summary } = data;

  const riskItems = products.filter((p) => p.readiness === "risk");
  const reviewItems = products.filter((p) => p.readiness === "review");
  const readyItems = products.filter((p) => p.readiness === "ready");
  const importedItems = products.filter((p) => p.readiness === "imported");
  const noDataItems = products.filter((p) => p.readiness === "no_data");

  const hasProducts = products.length > 0;

  return (
    <div className="space-y-8">
      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <IntelChip label="Listos para importar" value={summary.readyToImport} tone={summary.readyToImport > 0 ? "success" : "neutral"} />
        <IntelChip label="Requieren revisión" value={summary.needsReview} tone={summary.needsReview > 0 ? "warning" : "neutral"} />
        <IntelChip label="En riesgo" value={summary.atRisk} tone={summary.atRisk > 0 ? "danger" : "neutral"} />
        <IntelChip label="Ya importados" value={summary.alreadyImported} tone="neutral" />
        <IntelChip label="Sin datos" value={summary.noData} tone="muted" />
      </div>

      {/* ─── Operational Signals ─── */}
      {(summary.importedInDraft > 0 || summary.syncJobsFailed > 0 || summary.mirrorsOutOfSync > 0) && (
        <div className="space-y-2">
          {summary.syncJobsFailed > 0 && (
            <SignalBanner
              severity="critical"
              text={`${summary.syncJobsFailed} trabajo${summary.syncJobsFailed !== 1 ? "s" : ""} de sincronización fallido${summary.syncJobsFailed !== 1 ? "s" : ""}`}
              href="/admin/sourcing"
              actionLabel="Ver sync"
            />
          )}
          {summary.mirrorsOutOfSync > 0 && (
            <SignalBanner
              severity="high"
              text={`${summary.mirrorsOutOfSync} producto${summary.mirrorsOutOfSync !== 1 ? "s" : ""} espejo desincronizado${summary.mirrorsOutOfSync !== 1 ? "s" : ""}`}
              href="/admin/sourcing"
              actionLabel="Revisar"
            />
          )}
          {summary.importedInDraft > 0 && (
            <SignalBanner
              severity="normal"
              text={`${summary.importedInDraft} producto${summary.importedInDraft !== 1 ? "s" : ""} importado${summary.importedInDraft !== 1 ? "s" : ""} todavía en borrador`}
              href="/admin/catalog"
              actionLabel="Publicar"
            />
          )}
        </div>
      )}

      {/* ─── Product Groups ─── */}
      {hasProducts ? (
        <div className="space-y-8">
          {riskItems.length > 0 && (
            <ProductGroup label="En riesgo" readiness="risk" products={riskItems} />
          )}
          {reviewItems.length > 0 && (
            <ProductGroup label="Requieren revisión" readiness="review" products={reviewItems} />
          )}
          {readyItems.length > 0 && (
            <ProductGroup label="Listos para importar" readiness="ready" products={readyItems} />
          )}
          {importedItems.length > 0 && (
            <ProductGroup label="Ya importados" readiness="imported" products={importedItems} />
          )}
          {noDataItems.length > 0 && (
            <ProductGroup label="Sin datos suficientes" readiness="no_data" products={noDataItems} />
          )}
        </div>
      ) : (
        <EmptyIntelState />
      )}

      {/* ─── Scope ─── */}
      <ScopeBanner />
    </div>
  );
}

// ─── Sub-components ───

type Tone = "success" | "warning" | "danger" | "neutral" | "muted";

const toneText: Record<Tone, string> = {
  success: "text-[color:var(--signal-success)]",
  warning: "text-[color:var(--signal-warning)]",
  danger: "text-[color:var(--signal-danger)]",
  neutral: "text-ink-0",
  muted: "text-ink-5",
};

const toneDot: Record<Tone, string> = {
  success: "bg-[var(--signal-success)]",
  warning: "bg-[var(--signal-warning)]",
  danger: "bg-[var(--signal-danger)]",
  neutral: "bg-ink-3",
  muted: "bg-ink-6",
};

const readinessTone: Record<SourcingReadiness, Tone> = {
  risk: "danger",
  review: "warning",
  ready: "success",
  imported: "neutral",
  no_data: "muted",
};

function IntelChip({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className={cn("mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em]", toneText[tone])}>{value}</p>
    </div>
  );
}

function SignalBanner({ severity, text, href, actionLabel }: { severity: "critical" | "high" | "normal"; text: string; href: string; actionLabel: string }) {
  const severityTone: Record<typeof severity, Tone> = {
    critical: "danger",
    high: "warning",
    normal: "muted",
  };
  const tone = severityTone[severity];

  return (
    <Link href={href} className="group flex items-center gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[tone])} />
      <p className={cn("flex-1 text-[12px] font-medium", toneText[tone])}>{text}</p>
      <span className="flex items-center gap-1 text-[11px] font-medium text-ink-5 transition-colors group-hover:text-ink-0">
        {actionLabel} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function ProductGroup({ label, readiness, products }: { label: string; readiness: SourcingReadiness; products: ImportableProduct[] }) {
  const tone = readinessTone[readiness];

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
        <h3 className={cn("text-[10px] font-medium uppercase tracking-[0.14em]", toneText[tone])}>{label}</h3>
        <span className="inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] bg-[var(--surface-2)] text-ink-0 text-[10px] font-medium uppercase tracking-[0.14em]">{products.length}</span>
      </div>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
        <div className="divide-y divide-[color:var(--hairline)]">
          {products.map((p) => (
            <ProductRow key={p.providerProductId} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductRow({ product: p }: { product: ImportableProduct }) {
  const cta = p.alreadyImported
    ? { href: p.internalStatus === "draft" ? "/admin/catalog" : "/admin/inventory", label: p.internalStatus === "draft" ? "Revisar borrador" : "Ver en catálogo" }
    : { href: "/admin/sourcing", label: "Importar" };

  const tone = readinessTone[p.readiness];

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-1)] transition-colors">
      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)]">
        <ReadinessIcon readiness={p.readiness} />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink-0 truncate">{p.title}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-5">
          <span>{p.providerName}</span>
          <span className="text-ink-7">&bull;</span>
          <span>{p.category}</span>
          {p.signals.length > 0 && (
            <>
              <span className="text-ink-7">&bull;</span>
              <span className={cn("font-semibold", toneText[tone])}>{p.signals[0]}</span>
            </>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <div className="text-right w-20">
          <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Costo</p>
          <p className={cn("text-[13px] font-semibold tabular-nums", p.cost > 0 ? "text-ink-0" : "text-[color:var(--signal-danger)]")}>
            {p.cost > 0 ? `$${p.cost.toLocaleString("es-AR")}` : "—"}
          </p>
        </div>
        <div className="text-right w-20">
          <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Stock</p>
          <p className={cn("text-[13px] font-semibold tabular-nums", p.stock > 0 ? "text-ink-0" : "text-[color:var(--signal-danger)]")}>
            {p.stock > 0 ? `${p.stock} u.` : "0"}
          </p>
        </div>
        {p.estimatedMarginPercent !== null && (
          <div className="text-right w-20">
            <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Margen est.</p>
            <p className={cn(
              "text-[13px] font-semibold tabular-nums",
              p.estimatedMarginPercent >= 20 ? "text-[color:var(--signal-success)]" : p.estimatedMarginPercent >= 10 ? "text-[color:var(--signal-warning)]" : "text-[color:var(--signal-danger)]"
            )}>
              {p.estimatedMarginPercent}%
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href={cta.href}
        className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-ink-5 transition-colors hover:text-ink-0"
      >
        {cta.label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function ReadinessIcon({ readiness }: { readiness: SourcingReadiness }) {
  const cls = cn("h-3.5 w-3.5", toneText[readinessTone[readiness]]);
  switch (readiness) {
    case "risk": return <ShieldAlert className={cls} strokeWidth={1.75} />;
    case "review": return <Eye className={cls} strokeWidth={1.75} />;
    case "ready": return <Download className={cls} strokeWidth={1.75} />;
    case "imported": return <CheckCircle2 className={cls} strokeWidth={1.75} />;
    case "no_data": return <PackageX className={cls} strokeWidth={1.75} />;
  }
}

function EmptyIntelState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] p-12 text-center">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <Truck className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Sin productos de proveedor</h3>
      <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">
        Conectá un proveedor en la pestaña "Descubrir" para ver el análisis de importables.
      </p>
    </div>
  );
}

function ScopeBanner() {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <p className="text-[13px] font-semibold text-ink-0">Sourcing Intelligence v1</p>
      <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
        Clasifica productos de proveedor por disponibilidad, costo, stock y estado de importación.
        El margen estimado usa precio sugerido vs costo — no incluye fees externos ni shipping.
        Score por proveedor, aptitud de tienda y recomendación de Ads no están incluidos en esta versión.
      </p>
    </div>
  );
}
