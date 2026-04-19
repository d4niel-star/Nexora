"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Check,
  CircleDollarSign,
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
  batchPublishDrafts,
  batchMarkPreparing,
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
          <Brain className="h-4 w-4 text-ink-0" />
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-ink-0">
            Recomendaciones
          </h2>
          {activeCount > 0 && (
            <span className="bg-ink-0 text-ink-12 text-[10px] px-2 py-0.5 rounded-[var(--r-xs)] font-semibold">
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
            "flex items-center gap-1 rounded-[var(--r-xs)] px-2 py-0.5 text-[10px] font-semibold",
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
          "flex h-5 w-5 items-center justify-center rounded-[var(--r-xs)]",
          "bg-[var(--surface-2)]"
        )}>
          <DomainIcon domain={domain} />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-5">
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
    ? "border-[color:var(--hairline-strong)]"
    : rec.severity === "high"
      ? "border-[color:var(--hairline-strong)]"
      : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]";

  return (
    <div
      className={cn(
        "relative rounded-[var(--r-md)] border bg-[var(--surface-0)] p-4 shadow-[var(--shadow-soft)] transition-all duration-300 overflow-hidden",
        isResolved ? "opacity-0 scale-95 pointer-events-none" : borderClass
      )}
    >
      {/* Resolved overlay */}
      {isResolved && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-0)]/90">
          <div className="flex items-center gap-2 text-[color:var(--signal-success)]">
            <Check className="h-4 w-4" />
            <span className="text-[12px] font-semibold">{resolvedLabel}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {/* Severity dot */}
        <div className="pt-1 shrink-0">
          <span className={cn(
            "block h-2 w-2 rounded-full",
            rec.severity === "critical" ? "bg-[color:var(--signal-danger)]" :
            rec.severity === "high" ? "bg-[color:var(--signal-warning)]" :
            rec.severity === "normal" ? "bg-accent-400" : "bg-ink-6"
          )} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-0 leading-snug">{rec.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-4">{rec.reason}</p>
          <p className="mt-1.5 text-[10px] font-medium text-ink-6 italic">{rec.evidence}</p>
          {error && <p className="mt-1 text-[10px] font-semibold text-[color:var(--signal-danger)]">{error}</p>}
        </div>

        {/* Action area */}
        <div className="flex shrink-0 items-center gap-2 self-center">
          {rec.action && (
            <button
              onClick={() => executeAction(rec.action!)}
              disabled={isPending || isResolved}
              className={cn(
                "px-3 py-1.5 text-[11px] font-semibold rounded-[var(--r-sm)] transition-all flex items-center gap-1.5 disabled:opacity-50",
                "bg-ink-0 text-ink-12 hover:bg-ink-1"
              )}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {rec.action.label}
            </button>
          )}
          <Link
            href={rec.href}
            className="flex items-center gap-1 text-[11px] font-semibold text-ink-6 transition-colors hover:text-ink-0 whitespace-nowrap"
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
    case "ads": return <Megaphone className={cls} />;
    case "aptitude": return <Target className={cls} />;
  }
}

function severityBg(s: DecisionSeverity): string {
  switch (s) {
    case "critical": return "bg-[var(--surface-2)] text-[color:var(--signal-danger)]";
    case "high": return "bg-[var(--surface-2)] text-[color:var(--signal-warning)]";
    case "normal": return "bg-[var(--surface-2)] text-accent-500";
    case "info": return "bg-[var(--surface-2)] text-ink-5";
  }
}

function groupByDomain(recs: DecisionRecommendation[]): Array<{ domain: DecisionDomain; label: string; items: DecisionRecommendation[] }> {
  const domainLabels: Record<DecisionDomain, string> = {
    operations: "Operación",
    finance: "Finanzas",
    sourcing: "Sourcing",
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
  const domainOrder: DecisionDomain[] = ["operations", "finance", "sourcing", "ads", "aptitude"];
  return domainOrder
    .filter((d) => map.has(d))
    .map((d) => ({ domain: d, label: domainLabels[d], items: map.get(d)! }));
}

function actionSuccessLabel(type: string): string {
  switch (type) {
    case "publish_product": return "Publicado";
    case "mark_preparing": return "En preparación";
    case "retry_sync": return "Sync encolado";
    case "batch_publish": return "Batch publicado";
    case "batch_prepare": return "Batch preparado";
    default: return "Listo";
  }
}
