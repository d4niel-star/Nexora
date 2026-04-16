"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Check,
  CircleDollarSign,
  Globe,
  Loader2,
  PackageCheck,
  Truck,
  Megaphone,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  publishDraftProduct,
  markOrderPreparing,
  retryProviderSync,
  resyncListing,
  batchPublishDrafts,
  batchMarkPreparing,
  batchResyncListings,
  type BatchResult,
} from "@/app/admin/ai/execution-actions";
import type {
  DecisionDomain,
  DecisionEngineResult,
  DecisionRecommendation,
  DecisionSeverity,
  DomainHealth,
  ExecutableAction,
} from "@/types/decisions";

export function DecisionQueue({ data }: { data: DecisionEngineResult }) {
  const { recommendations, domains } = data;
  const [resolvedIds, setResolvedIds] = useState<Map<string, string>>(new Map());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  if (recommendations.length === 0) return null;

  const visibleRecs = recommendations.filter((r) => !removedIds.has(r.id));
  const grouped = groupByDomain(visibleRecs);
  const activeCount = visibleRecs.length - resolvedIds.size;

  const handleResolved = (recId: string, label: string) => {
    setResolvedIds((prev) => new Map(prev).set(recId, label));
    setTimeout(() => {
      setRemovedIds((prev) => new Set(prev).add(recId));
      setResolvedIds((prev) => { const m = new Map(prev); m.delete(recId); return m; });
    }, 1200);
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#111111]" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#111111]">
            Recomendaciones
          </h2>
          {activeCount > 0 && (
            <span className="bg-[#111111] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <DomainPills domains={domains} />
      </div>

      {/* Grouped recommendations */}
      <div className="space-y-4">
        {grouped.map(({ domain, label, items }) => (
          <DomainGroup
            key={domain}
            domain={domain}
            label={label}
            items={items}
            resolvedIds={resolvedIds}
            onResolved={handleResolved}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Sub-components ───

function DomainPills({ domains }: { domains: DomainHealth[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {domains.map((d) => (
        <span
          key={d.domain}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
            severityBg(d.maxSeverity)
          )}
        >
          <DomainIcon domain={d.domain} />
          {d.count}
        </span>
      ))}
    </div>
  );
}

function DomainGroup({
  domain,
  label,
  items,
  resolvedIds,
  onResolved,
}: {
  domain: DecisionDomain;
  label: string;
  items: DecisionRecommendation[];
  resolvedIds: Map<string, string>;
  onResolved: (id: string, label: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          "flex h-5 w-5 items-center justify-center rounded",
          domainBg(domain)
        )}>
          <DomainIcon domain={domain} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888888]">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((rec) => (
          <RecommendationCard
            key={rec.id}
            rec={rec}
            resolvedLabel={resolvedIds.get(rec.id)}
            onResolved={onResolved}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  resolvedLabel,
  onResolved,
}: {
  rec: DecisionRecommendation;
  resolvedLabel?: string;
  onResolved: (id: string, label: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isResolved = !!resolvedLabel;

  const executeAction = (action: ExecutableAction) => {
    setError(null);
    startTransition(async () => {
      let result: { success: boolean; error?: string };

      switch (action.type) {
        case "publish_product":
          result = await publishDraftProduct(action.entityId);
          break;
        case "mark_preparing":
          result = await markOrderPreparing(action.entityId);
          break;
        case "retry_sync":
          result = await retryProviderSync(action.entityId);
          break;
        case "resync_listing":
          result = await resyncListing(action.entityId);
          break;
        case "batch_publish": {
          const br = await batchPublishDrafts();
          if (br.processed > 0) {
            onResolved(rec.id, `${br.processed} publicado(s)${br.failed > 0 ? ` · ${br.failed} error(es)` : ""}`);
          } else if (br.failed > 0) {
            setError(`${br.failed} fallido(s)`);
          }
          router.refresh();
          return;
        }
        case "batch_prepare": {
          const br = await batchMarkPreparing();
          if (br.processed > 0) {
            onResolved(rec.id, `${br.processed} en preparación${br.failed > 0 ? ` · ${br.failed} error(es)` : ""}`);
          } else if (br.failed > 0) {
            setError(`${br.failed} fallido(s)`);
          }
          router.refresh();
          return;
        }
        case "batch_resync": {
          const br = await batchResyncListings();
          if (br.processed > 0) {
            onResolved(rec.id, `${br.processed} resincronizado(s)${br.failed > 0 ? ` · ${br.failed} error(es)` : ""}`);
          } else if (br.failed > 0) {
            setError(`${br.failed} fallido(s)`);
          }
          router.refresh();
          return;
        }
        default:
          result = { success: false, error: "Acción no soportada" };
      }

      if (result.success) {
        onResolved(rec.id, actionSuccessLabel(action.type));
        router.refresh();
      } else {
        setError(result.error || "Error inesperado");
      }
    });
  };

  const borderClass = rec.severity === "critical"
    ? "border-red-200 hover:border-red-300"
    : rec.severity === "high"
      ? "border-amber-200 hover:border-amber-300"
      : "border-[#EAEAEA] hover:border-gray-300";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 overflow-hidden",
        isResolved ? "opacity-0 scale-95 pointer-events-none" : borderClass
      )}
    >
      {/* Resolved overlay */}
      {isResolved && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-4 w-4" />
            <span className="text-[12px] font-bold">{resolvedLabel}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {/* Severity dot */}
        <div className="pt-1 shrink-0">
          <span className={cn(
            "block h-2 w-2 rounded-full",
            rec.severity === "critical" ? "bg-red-500" :
            rec.severity === "high" ? "bg-amber-500" :
            rec.severity === "normal" ? "bg-blue-400" : "bg-gray-400"
          )} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#111111] leading-snug">{rec.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#666666]">{rec.reason}</p>
          <p className="mt-1.5 text-[10px] font-medium text-[#AAAAAA] italic">{rec.evidence}</p>
          {error && <p className="mt-1 text-[10px] font-bold text-red-500">{error}</p>}
        </div>

        {/* Action area */}
        <div className="flex shrink-0 items-center gap-2 self-center">
          {rec.action && (
            <button
              onClick={() => executeAction(rec.action!)}
              disabled={isPending || isResolved}
              className={cn(
                "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50",
                "bg-[#111111] text-white hover:bg-black"
              )}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {rec.action.label}
            </button>
          )}
          <Link
            href={rec.href}
            className="flex items-center gap-1 text-[11px] font-bold text-[#BBBBBB] transition-colors hover:text-[#111111] whitespace-nowrap"
          >
            {rec.action ? "Ver" : rec.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DomainIcon({ domain }: { domain: DecisionDomain }) {
  const cls = "h-3 w-3";
  switch (domain) {
    case "operations": return <PackageCheck className={cls} />;
    case "finance": return <CircleDollarSign className={cls} />;
    case "sourcing": return <Truck className={cls} />;
    case "channels": return <Globe className={cls} />;
    case "ads": return <Megaphone className={cls} />;
    case "aptitude": return <Target className={cls} />;
  }
}

function severityBg(s: DecisionSeverity): string {
  switch (s) {
    case "critical": return "bg-red-100 text-red-700";
    case "high": return "bg-amber-100 text-amber-700";
    case "normal": return "bg-blue-50 text-blue-600";
    case "info": return "bg-gray-100 text-gray-500";
  }
}

function domainBg(d: DecisionDomain): string {
  switch (d) {
    case "operations": return "bg-purple-100";
    case "finance": return "bg-blue-100";
    case "sourcing": return "bg-emerald-100";
    case "channels": return "bg-amber-100";
    case "ads": return "bg-pink-100";
    case "aptitude": return "bg-violet-100";
  }
}

function groupByDomain(recs: DecisionRecommendation[]): Array<{ domain: DecisionDomain; label: string; items: DecisionRecommendation[] }> {
  const domainLabels: Record<DecisionDomain, string> = {
    operations: "Operación",
    finance: "Finanzas",
    sourcing: "Sourcing",
    channels: "Canales",
    ads: "Ads",
    aptitude: "Aptitud",
  };

  const map = new Map<DecisionDomain, DecisionRecommendation[]>();
  for (const r of recs) {
    const arr = map.get(r.domain) || [];
    arr.push(r);
    map.set(r.domain, arr);
  }

  // Order domains by max severity of their items
  const domainOrder: DecisionDomain[] = ["operations", "finance", "channels", "sourcing", "ads", "aptitude"];
  return domainOrder
    .filter((d) => map.has(d))
    .map((d) => ({ domain: d, label: domainLabels[d], items: map.get(d)! }));
}

function actionSuccessLabel(type: string): string {
  switch (type) {
    case "publish_product": return "Publicado";
    case "mark_preparing": return "En preparación";
    case "retry_sync": return "Sync encolado";
    case "resync_listing": return "Resincronizado";
    case "batch_publish": return "Batch publicado";
    case "batch_prepare": return "Batch preparado";
    case "batch_resync": return "Batch resincronizado";
    default: return "Listo";
  }
}
