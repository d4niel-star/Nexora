"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowRight,
  Loader2,
  Shield,
  CircleDashed,
  Circle,
  Target,
} from "lucide-react";
import { fetchStoreReadiness } from "@/lib/readiness/actions";
import { buildMerchantOnboarding, MerchantOnboarding, OnboardingStep } from "@/lib/readiness/onboarding-mapper";
import { ReadinessItem, StoreReadiness } from "@/lib/readiness/store-readiness";

export function MerchantOnboardingGuide() {
  const [data, setData] = useState<MerchantOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStoreReadiness()
      .then((r) => {
        if (r) {
          const onboarding = buildMerchantOnboarding(r);
          setData(onboarding);
          
          // Auto-expand first incomplete step
          const firstIncomplete = onboarding.steps.find((s) => s.status !== "complete");
          if (firstIncomplete) {
            setExpandedStep(firstIncomplete.id);
          }
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="nx-panel p-6" data-testid="merchant-onboarding-guide">
        <div className="flex items-center gap-2 text-[13px] text-ink-5">
          <Loader2 className="w-4 h-4 animate-spin" /> Evaluando estado de tu tienda…
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="nx-panel overflow-hidden" data-testid="merchant-onboarding-guide">
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
        
        {/* Next Best Action */}
        {data.nextAction && (
          <div className="mt-4 p-3.5 rounded-lg bg-[var(--surface-1)] border border-[color:var(--hairline)] flex items-start gap-3">
            <Target className="w-4 h-4 text-[color:var(--brand)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-ink-0">Próximo paso recomendado: {data.nextAction.title}</p>
              <p className="text-[11px] text-ink-5 mt-0.5">{data.nextAction.description}</p>
            </div>
            {data.nextAction.href && (
              <Link 
                href={data.nextAction.href}
                className="shrink-0 nx-action nx-action--primary nx-action--sm"
              >
                {data.nextAction.label}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Steps list */}
      <div className="divide-y divide-[color:var(--hairline)]">
        {data.steps.map((step) => {
          const isExpanded = expandedStep === step.id;

          return (
            <div key={step.id}>
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-1)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-medium text-ink-0">
                        {step.title}
                      </span>
                      {step.blockingCount > 0 && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Bloqueante
                        </span>
                      )}
                    </div>
                    {isExpanded && (
                      <p className="text-[11px] text-ink-5 mt-0.5 max-w-sm">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] text-ink-5 tabular-nums hidden sm:inline-block">
                    {step.progress}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-ink-5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ink-5" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-1 bg-[var(--surface-1)]">
                  <div className="pl-7 space-y-1">
                    {step.items.map((item) => (
                      <ReadinessRow key={item.id} item={item} />
                    ))}
                  </div>
                  
                  {step.primaryActionHref && step.status !== "complete" && (
                    <div className="pl-7 mt-4 flex items-center gap-2">
                      <Link 
                        href={step.primaryActionHref}
                        className="nx-action nx-action--primary nx-action--sm"
                      >
                        {step.primaryActionLabel || "Revisar"}
                      </Link>
                    </div>
                  )}
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
  };

  const itemConfig = config[status];
  const Icon = itemConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${itemConfig.bg} ${itemConfig.text} ${itemConfig.border}`}
    >
      <Icon className="w-3 h-3" />
      {itemConfig.label}
    </span>
  );
}

function StepIcon({ status }: { status: OnboardingStep["status"] }) {
  if (status === "complete") {
    return <CheckCircle2 className="w-4 h-4 text-[color:var(--signal-success)]" />;
  }
  if (status === "blocked") {
    return <XCircle className="w-4 h-4 text-[color:var(--signal-danger)]" />;
  }
  if (status === "recommended" || status === "in_progress") {
    return <CircleDashed className="w-4 h-4 text-[color:var(--signal-warning)]" />;
  }
  return <Circle className="w-4 h-4 text-ink-6" />;
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const StatusIcon =
    item.status === "complete"
      ? CheckCircle2
      : item.severity === "blocking" && item.status === "missing"
        ? XCircle
        : AlertTriangle;

  const statusColor =
    item.status === "complete"
      ? "text-emerald-500"
      : item.severity === "blocking" && item.status === "missing"
        ? "text-red-500"
        : "text-amber-500";
        
  const severityBadge = 
    item.severity === "blocking"
      ? <span className="inline-block ml-1.5 text-[9px] uppercase font-semibold text-red-600 bg-red-50 px-1 rounded">Bloqueante</span>
      : item.severity === "recommended"
        ? <span className="inline-block ml-1.5 text-[9px] uppercase font-semibold text-amber-700 bg-amber-50 px-1 rounded">Recomendado</span>
        : <span className="inline-block ml-1.5 text-[9px] uppercase font-semibold text-ink-5 bg-[var(--surface-3)] px-1 rounded">Opcional</span>;

  return (
    <div className="flex items-start gap-2.5 py-1.5 group">
      <StatusIcon
        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${statusColor}`}
        strokeWidth={2}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[12px] font-medium text-ink-0">{item.label}</p>
          {item.status !== "complete" && severityBadge}
        </div>
        {item.status !== "complete" ? (
           <p className="text-[11px] text-ink-5 mt-0.5">{item.evidence || item.description}</p>
        ) : (
          item.evidence && <p className="text-[11px] text-ink-5 mt-0.5">{item.evidence}</p>
        )}
      </div>
      {item.actionHref && item.status !== "complete" && (
        <Link
          href={item.actionHref}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--brand)] hover:underline transition-colors opacity-0 group-hover:opacity-100"
        >
          {item.actionLabel || "Configurar"}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
