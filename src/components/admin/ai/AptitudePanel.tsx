"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Store,
  Package,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AptitudeReport,
  AptitudeVerdict,
  AptitudeSignal,
  ProductAptitude,
} from "@/types/aptitude";

type TabView = "channel" | "ads";
type VerdictFilter = "all" | AptitudeVerdict;

export function AptitudePanel({ report }: { report: AptitudeReport }) {
  const [tab, setTab] = useState<TabView>("channel");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const s = report.summary;

  const filtered = useMemo(() => {
    if (verdictFilter === "all") return report.products;
    return report.products.filter((p) =>
      tab === "channel" ? p.generalVerdict === verdictFilter : p.adsAptitude.verdict === verdictFilter,
    );
  }, [report.products, verdictFilter, tab]);

  const channelCounts = { apt: s.channelApt, review: s.channelReview, not_apt: s.channelNotApt, insufficient_data: s.channelInsufficient };
  const adsCounts = { apt: s.adsApt, review: s.adsReview, not_apt: s.adsNotApt, insufficient_data: s.adsInsufficient };
  const counts = tab === "channel" ? channelCounts : adsCounts;

  if (s.totalProducts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-10 w-10 text-gray-300" />
        <p className="mt-4 text-sm font-bold text-[#111111]">Sin productos en catálogo</p>
        <p className="mt-1 text-xs text-[#888888]">Cargá o importá productos para evaluar aptitud.</p>
        <Link href="/admin/catalog" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
          Ir al catálogo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 shadow-sm">
        <p className="text-sm font-bold text-[#111111]">Channel & Ads Aptitude v1</p>
        <p className="mt-1 text-xs leading-relaxed text-[#666666]">
          Evaluación por producto basada en señales reales: stock, costo, estado, publicación, sync, y contribución neta.
          No hay scores inventados — cada veredicto se explica con evidencia observable.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab("channel"); setVerdictFilter("all"); }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
            tab === "channel" ? "bg-[#111111] text-white" : "bg-white border border-[#EAEAEA] text-[#888888] hover:text-[#111111]",
          )}
        >
          <Store className="h-3.5 w-3.5" /> Canal
        </button>
        <button
          onClick={() => { setTab("ads"); setVerdictFilter("all"); }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
            tab === "ads" ? "bg-[#111111] text-white" : "bg-white border border-[#EAEAEA] text-[#888888] hover:text-[#111111]",
          )}
        >
          <Megaphone className="h-3.5 w-3.5" /> Ads
        </button>
      </div>

      {/* Verdict distribution */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <VerdictCard verdict="apt" count={counts.apt} total={s.totalProducts} active={verdictFilter === "apt"} onClick={() => setVerdictFilter(verdictFilter === "apt" ? "all" : "apt")} />
        <VerdictCard verdict="review" count={counts.review} total={s.totalProducts} active={verdictFilter === "review"} onClick={() => setVerdictFilter(verdictFilter === "review" ? "all" : "review")} />
        <VerdictCard verdict="not_apt" count={counts.not_apt} total={s.totalProducts} active={verdictFilter === "not_apt"} onClick={() => setVerdictFilter(verdictFilter === "not_apt" ? "all" : "not_apt")} />
        <VerdictCard verdict="insufficient_data" count={counts.insufficient_data} total={s.totalProducts} active={verdictFilter === "insufficient_data"} onClick={() => setVerdictFilter(verdictFilter === "insufficient_data" ? "all" : "insufficient_data")} />
      </div>

      {/* Top blockers */}
      {s.topBlockers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Principales bloqueantes</h3>
          <div className="flex flex-wrap gap-2">
            {s.topBlockers.map((b) => (
              <Link
                key={b.key}
                href={b.actionHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 transition-colors"
              >
                <XCircle className="h-3 w-3" />
                {b.label} ({b.count})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
            {verdictFilter === "all" ? "Todos los productos" : verdictLabel(verdictFilter)} ({filtered.length})
          </h3>
          {verdictFilter !== "all" && (
            <button onClick={() => setVerdictFilter("all")} className="text-[10px] font-bold text-blue-600 hover:underline">
              Mostrar todos
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {filtered.slice(0, 50).map((p) => (
            <ProductAptitudeRow
              key={p.productId}
              product={p}
              tab={tab}
              expanded={expandedId === p.productId}
              onToggle={() => setExpandedId(expandedId === p.productId ? null : p.productId)}
            />
          ))}
          {filtered.length > 50 && (
            <p className="py-3 text-center text-[10px] font-medium text-[#AAAAAA]">
              Mostrando 50 de {filtered.length} productos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function VerdictCard({ verdict, count, total, active, onClick }: { verdict: AptitudeVerdict; count: number; total: number; active: boolean; onClick: () => void }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const config = verdictConfig(verdict);

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all shadow-sm",
        active ? `${config.activeBg} ${config.activeBorder}` : "border-[#EAEAEA] bg-white hover:border-gray-300",
      )}
    >
      <div className="flex items-center gap-1.5">
        {config.icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">{config.label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-[#111111]">{count}</p>
      <p className="text-[10px] font-medium text-[#AAAAAA]">{pct}% del catálogo</p>
    </button>
  );
}

function ProductAptitudeRow({ product, tab, expanded, onToggle }: { product: ProductAptitude; tab: TabView; expanded: boolean; onToggle: () => void }) {
  const verdict = tab === "channel" ? product.generalVerdict : product.adsAptitude.verdict;
  const signals = tab === "channel" ? product.generalSignals : product.adsAptitude.signals;
  const config = verdictConfig(verdict);
  const aptitude = tab === "ads" ? product.adsAptitude : null;

  return (
    <div className={cn("rounded-xl border transition-all", expanded ? "border-[#CCCCCC] bg-white shadow-sm" : "border-[#EAEAEA] bg-white")}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {product.image ? (
          <img src={product.image} alt="" className="h-8 w-8 rounded-lg border border-gray-100 object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 bg-gray-50">
            <Package className="h-4 w-4 text-gray-300" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#111111]">{product.title}</p>
          <p className="mt-0.5 text-[10px] text-[#AAAAAA]">
            {product.category}{product.supplier ? ` · ${product.supplier}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VerdictBadge verdict={verdict} />
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-[#AAAAAA]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#AAAAAA]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#EAEAEA] px-4 py-3 space-y-3">
          {/* Signals */}
          <div className="space-y-1.5">
            {signals.map((s, i) => (
              <SignalRow key={`${s.key}-${i}`} signal={s} />
            ))}
            {/* Channel-specific signals if in channel tab */}
            {tab === "channel" && product.channelAptitudes.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-dashed border-[#EAEAEA] pt-2">
                {product.channelAptitudes.map((ca) => (
                  <div key={ca.channel} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">{ca.channelLabel}</span>
                      <VerdictBadge verdict={ca.verdict} size="sm" />
                    </div>
                    {ca.signals.map((s, i) => (
                      <SignalRow key={`${ca.channel}-${s.key}-${i}`} signal={s} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            {tab === "channel" && product.channelAptitudes.length > 0 ? (
              product.channelAptitudes
                .filter((ca) => ca.verdict !== "apt")
                .slice(0, 2)
                .map((ca) => (
                  <Link
                    key={ca.channel}
                    href={ca.actionHref}
                    className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#333333] transition-colors"
                  >
                    {ca.actionLabel} <ArrowRight className="h-3 w-3" />
                  </Link>
                ))
            ) : aptitude ? (
              <Link
                href={aptitude.actionHref}
                className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#333333] transition-colors"
              >
                {aptitude.actionLabel} <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
            <Link href={`/admin/catalog`} className="text-[10px] font-bold text-blue-600 hover:underline">
              Ver producto
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: AptitudeSignal }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        signal.impact === "positive" ? "bg-emerald-500" :
        signal.impact === "negative" ? "bg-amber-500" :
        signal.impact === "blocking" ? "bg-red-500" :
        "bg-gray-300",
      )} />
      <span className="text-[11px] font-bold text-[#888888]">{signal.label}:</span>
      <span className={cn(
        "text-[11px] font-medium",
        signal.impact === "positive" ? "text-emerald-700" :
        signal.impact === "negative" ? "text-amber-700" :
        signal.impact === "blocking" ? "text-red-700" :
        "text-[#AAAAAA]",
      )}>{signal.value}</span>
    </div>
  );
}

function VerdictBadge({ verdict, size = "md" }: { verdict: AptitudeVerdict; size?: "sm" | "md" }) {
  const config = verdictConfig(verdict);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider",
      config.badgeCls,
      size === "sm" ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[10px]",
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Verdict config ───

function verdictConfig(v: AptitudeVerdict) {
  switch (v) {
    case "apt":
      return {
        label: "Apto",
        icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
        badgeCls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        activeBg: "bg-emerald-50",
        activeBorder: "border-emerald-300",
      };
    case "review":
      return {
        label: "Revisión",
        icon: <AlertTriangle className="h-3 w-3 text-amber-600" />,
        badgeCls: "bg-amber-50 text-amber-700 border border-amber-200",
        activeBg: "bg-amber-50",
        activeBorder: "border-amber-300",
      };
    case "not_apt":
      return {
        label: "No apto",
        icon: <XCircle className="h-3 w-3 text-red-600" />,
        badgeCls: "bg-red-50 text-red-700 border border-red-200",
        activeBg: "bg-red-50",
        activeBorder: "border-red-300",
      };
    case "insufficient_data":
      return {
        label: "Sin datos",
        icon: <HelpCircle className="h-3 w-3 text-gray-400" />,
        badgeCls: "bg-gray-50 text-gray-500 border border-gray-200",
        activeBg: "bg-gray-50",
        activeBorder: "border-gray-300",
      };
  }
}

function verdictLabel(v: AptitudeVerdict): string {
  switch (v) {
    case "apt": return "Aptos";
    case "review": return "Requieren revisión";
    case "not_apt": return "No aptos";
    case "insufficient_data": return "Datos insuficientes";
  }
}
