"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Loader2,
  Shield,
  Sparkles,
  Info,
} from "lucide-react";
import { fetchStoreReadiness } from "@/lib/readiness/actions";
import type {
  StoreReadiness,
  ReadinessItem,
  ReadinessSeverity,
  ReadinessStatus,
} from "@/lib/readiness/store-readiness";

// ─── Readiness Panel — Dashboard widget ─────────────────────────────────
// Shows operational readiness with real data. Groups items by category,
// highlights blockers, shows score, and provides direct CTAs.

export function ReadinessPanel() {
  const [data, setData] = useState<StoreReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStoreReadiness()
      .then((r) => {
        setData(r);
        // Auto-expand first category with issues
        if (r) {
          const firstBlocking = r.items.find(
            (i) => i.severity === "blocking" && i.status === "missing",
          );
          if (firstBlocking) setExpandedCategory(firstBlocking.category);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="nx-panel p-6">
        <div className="flex items-center gap-2 text-[13px] text-ink-5">
          <Loader2 className="w-4 h-4 animate-spin" /> Evaluando estado de tu tienda…
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Group items by category
  const categories = new Map<string, ReadinessItem[]>();
  for (const item of data.items) {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category)!.push(item);
  }

  return (
    <div className="nx-panel overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-[color:var(--hairline)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold text-ink-0">
              Preparación para vender
            </h3>
          </div>
          <StatusBadge status={data.overallStatus} />
        </div>

        {/* Score bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-ink-5">Progreso</span>
            <span className="text-[11px] font-medium text-ink-3 tabular-nums">
              {data.score}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${data.score}%`,
                backgroundColor:
                  data.overallStatus === "ready"
                    ? "var(--signal-success)"
                    : data.overallStatus === "almost_ready"
                      ? "var(--signal-warning)"
                      : "var(--signal-danger)",
              }}
            />
          </div>
        </div>

        {/* Summary chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.blockingMissing > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
              <XCircle className="w-3 h-3" />
              {data.blockingMissing} bloqueante{data.blockingMissing !== 1 && "s"}
            </span>
          )}
          {data.recommendedMissing > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              {data.recommendedMissing} recomendado{data.recommendedMissing !== 1 && "s"}
            </span>
          )}
          {data.blockingMissing === 0 && data.recommendedMissing === 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Todo en orden
            </span>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="divide-y divide-[color:var(--hairline)]">
        {[...categories.entries()].map(([category, catItems]) => {
          const isExpanded = expandedCategory === category;
          const catMissing = catItems.filter(
            (i) => i.status === "missing" || i.status === "warning",
          ).length;
          const catComplete = catItems.filter((i) => i.status === "complete").length;
          const hasBlocker = catItems.some(
            (i) => i.severity === "blocking" && i.status === "missing",
          );

          return (
            <div key={category}>
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : category)
                }
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-1)] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <CategoryDot items={catItems} />
                  <span className="text-[12px] font-medium text-ink-0">
                    {category}
                  </span>
                  <span className="text-[10px] text-ink-5 tabular-nums">
                    {catComplete}/{catItems.length}
                  </span>
                  {hasBlocker && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Bloqueante
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-ink-5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-ink-5" />
                )}
              </button>

              {isExpanded && (
                <div className="px-5 pb-3 space-y-1">
                  {catItems.map((item) => (
                    <ReadinessRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: StoreReadiness["overallStatus"];
}) {
  const config = {
    ready: {
      label: "Lista para vender",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: CheckCircle2,
    },
    almost_ready: {
      label: "Casi lista",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: AlertTriangle,
    },
    not_ready: {
      label: "No lista",
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: XCircle,
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CategoryDot({ items }: { items: ReadinessItem[] }) {
  const hasBlocker = items.some(
    (i) => i.severity === "blocking" && i.status === "missing",
  );
  const hasWarning = items.some(
    (i) => i.status === "missing" || i.status === "warning",
  );
  const allComplete = items.every(
    (i) => i.status === "complete" || i.status === "not_applicable",
  );

  const color = hasBlocker
    ? "bg-red-500"
    : hasWarning
      ? "bg-amber-500"
      : allComplete
        ? "bg-emerald-500"
        : "bg-[var(--surface-3)]";

  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const StatusIcon =
    item.status === "complete"
      ? CheckCircle2
      : item.status === "warning"
        ? AlertTriangle
        : item.status === "not_applicable"
          ? Info
          : XCircle;

  const statusColor =
    item.status === "complete"
      ? "text-emerald-500"
      : item.status === "warning"
        ? "text-amber-500"
        : item.status === "not_applicable"
          ? "text-ink-6"
          : item.severity === "blocking"
            ? "text-red-500"
            : "text-amber-500";

  return (
    <div className="flex items-start gap-2.5 py-1.5 group">
      <StatusIcon
        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${statusColor}`}
        strokeWidth={2}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-ink-0">{item.label}</p>
        {item.evidence && (
          <p className="text-[11px] text-ink-5 mt-0.5">{item.evidence}</p>
        )}
      </div>
      {item.actionHref && item.status !== "complete" && item.status !== "not_applicable" && (
        <Link
          href={item.actionHref}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-ink-5 hover:text-ink-0 transition-colors opacity-0 group-hover:opacity-100"
        >
          {item.actionLabel || "Configurar"}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
