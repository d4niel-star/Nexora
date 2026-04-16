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
        <IntelChip label="Listos para importar" value={summary.readyToImport} color={summary.readyToImport > 0 ? "emerald" : undefined} />
        <IntelChip label="Requieren revisión" value={summary.needsReview} color={summary.needsReview > 0 ? "amber" : undefined} />
        <IntelChip label="En riesgo" value={summary.atRisk} color={summary.atRisk > 0 ? "red" : undefined} />
        <IntelChip label="Ya importados" value={summary.alreadyImported} />
        <IntelChip label="Sin datos" value={summary.noData} color={summary.noData > 0 ? "gray" : undefined} />
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

function IntelChip({ label, value, color }: { label: string; value: number; color?: string }) {
  const border = color === "red" ? "border-red-200" : color === "amber" ? "border-amber-200" : color === "emerald" ? "border-emerald-200" : color === "gray" ? "border-gray-200" : "border-[#EAEAEA]";
  const bg = color === "red" ? "bg-red-50" : color === "amber" ? "bg-amber-50" : color === "emerald" ? "bg-emerald-50" : color === "gray" ? "bg-gray-50" : "bg-white";
  const valueColor = color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : color === "emerald" ? "text-emerald-700" : "text-[#111111]";

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm", border, bg)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888888]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-black tabular-nums", valueColor)}>{value}</p>
    </div>
  );
}

function SignalBanner({ severity, text, href, actionLabel }: { severity: "critical" | "high" | "normal"; text: string; href: string; actionLabel: string }) {
  const styles = {
    critical: "border-red-200 bg-red-50",
    high: "border-amber-200 bg-amber-50",
    normal: "border-[#EAEAEA] bg-[#FAFAFA]",
  };
  const dot = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    normal: "bg-gray-400",
  };
  const textColor = {
    critical: "text-red-800",
    high: "text-amber-800",
    normal: "text-[#666666]",
  };

  return (
    <Link href={href} className={cn("group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm", styles[severity])}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot[severity])} />
      <p className={cn("flex-1 text-xs font-bold", textColor[severity])}>{text}</p>
      <span className="text-[11px] font-bold text-[#AAAAAA] transition-colors group-hover:text-[#111111] flex items-center gap-1">
        {actionLabel} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function ProductGroup({ label, readiness, products }: { label: string; readiness: SourcingReadiness; products: ImportableProduct[] }) {
  const dotColor = readiness === "risk" ? "bg-red-500" : readiness === "review" ? "bg-amber-500" : readiness === "ready" ? "bg-emerald-500" : readiness === "imported" ? "bg-blue-400" : "bg-gray-400";
  const labelColor = readiness === "risk" ? "text-red-600" : readiness === "review" ? "text-amber-600" : readiness === "ready" ? "text-emerald-600" : "text-[#888888]";

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("h-2 w-2 rounded-full", dotColor)} />
        <h3 className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", labelColor)}>{label}</h3>
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          readiness === "risk" ? "bg-red-100 text-red-700" : readiness === "review" ? "bg-amber-100 text-amber-700" : readiness === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        )}>{products.length}</span>
      </div>
      <div className="rounded-xl border border-[#EAEAEA] bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-[#F0F0F0]">
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

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
      {/* Icon */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        p.readiness === "risk" ? "bg-red-100" : p.readiness === "review" ? "bg-amber-100" : p.readiness === "ready" ? "bg-emerald-100" : p.readiness === "imported" ? "bg-blue-50" : "bg-gray-100"
      )}>
        <ReadinessIcon readiness={p.readiness} />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[#111111] truncate">{p.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#999999]">
          <span>{p.providerName}</span>
          <span className="text-[#E0E0E0]">&bull;</span>
          <span>{p.category}</span>
          {p.signals.length > 0 && (
            <>
              <span className="text-[#E0E0E0]">&bull;</span>
              <span className={cn(
                "font-bold",
                p.readiness === "risk" ? "text-red-500" : p.readiness === "review" ? "text-amber-500" : "text-[#999999]"
              )}>{p.signals[0]}</span>
            </>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <div className="text-right w-20">
          <p className="text-[10px] text-[#AAAAAA] font-bold">Costo</p>
          <p className={cn("text-[13px] font-bold tabular-nums", p.cost > 0 ? "text-[#111111]" : "text-red-400")}>
            {p.cost > 0 ? `$${p.cost.toLocaleString("es-AR")}` : "—"}
          </p>
        </div>
        <div className="text-right w-20">
          <p className="text-[10px] text-[#AAAAAA] font-bold">Stock</p>
          <p className={cn("text-[13px] font-bold tabular-nums", p.stock > 0 ? "text-[#111111]" : "text-red-400")}>
            {p.stock > 0 ? `${p.stock} u.` : "0"}
          </p>
        </div>
        {p.estimatedMarginPercent !== null && (
          <div className="text-right w-20">
            <p className="text-[10px] text-[#AAAAAA] font-bold">Margen est.</p>
            <p className={cn(
              "text-[13px] font-bold tabular-nums",
              p.estimatedMarginPercent >= 20 ? "text-emerald-600" : p.estimatedMarginPercent >= 10 ? "text-amber-600" : "text-red-500"
            )}>
              {p.estimatedMarginPercent}%
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href={cta.href}
        className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#AAAAAA] transition-colors hover:text-[#111111]"
      >
        {cta.label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function ReadinessIcon({ readiness }: { readiness: SourcingReadiness }) {
  const cls = "h-3.5 w-3.5";
  switch (readiness) {
    case "risk": return <ShieldAlert className={cn(cls, "text-red-600")} />;
    case "review": return <Eye className={cn(cls, "text-amber-600")} />;
    case "ready": return <Download className={cn(cls, "text-emerald-600")} />;
    case "imported": return <CheckCircle2 className={cn(cls, "text-blue-500")} />;
    case "no_data": return <PackageX className={cn(cls, "text-gray-400")} />;
  }
}

function EmptyIntelState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEAEA] bg-white p-12 text-center">
      <Truck className="h-8 w-8 text-gray-300 mb-3" />
      <h3 className="text-base font-extrabold text-[#111111]">Sin productos de proveedor</h3>
      <p className="mt-1 max-w-sm text-xs font-medium text-[#888888]">
        Conectá un proveedor en la pestaña "Descubrir" para ver el análisis de importables.
      </p>
    </div>
  );
}

function ScopeBanner() {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 shadow-sm">
      <p className="text-sm font-bold text-[#111111]">Sourcing Intelligence v1</p>
      <p className="mt-1 text-xs leading-relaxed text-[#666666]">
        Clasifica productos de proveedor por disponibilidad, costo, stock y estado de importación.
        El margen estimado usa precio sugerido vs costo — no incluye fees de canal ni shipping.
        Score por proveedor, aptitud por canal y recomendación de Ads no están incluidos en esta versión.
      </p>
    </div>
  );
}
