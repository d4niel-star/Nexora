"use client";

import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ActivationState, ActivationStep, ActivationTier, ActivationStepStatus } from "@/types/activation";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

const TIER_META: Record<ActivationTier, { label: string; color: string }> = {
  blocker: { label: "Requisito", color: "text-[color:var(--signal-danger)]" },
  accelerator: { label: "Acelerador", color: "text-[color:var(--signal-warning)]" },
  recommended: { label: "Recomendado", color: "text-[var(--accent-500)]" },
};

export function OnboardingDashboard({ data }: { data: ActivationState }) {
  const { steps, score, completedSteps, totalSteps, blockers } = data;

  const allTiers: ActivationTier[] = ["blocker", "accelerator", "recommended"];
  const tierGroups = allTiers
    .map((tier) => ({ tier, steps: steps.filter((s) => s.tier === tier) }))
    .filter((g) => g.steps.length > 0);

  const subtitle =
    blockers > 0
      ? `Hay ${blockers} paso${blockers !== 1 ? "s" : ""} bloqueante${blockers !== 1 ? "s" : ""} para empezar a vender. Resolvelos primero.`
      : score < 100
        ? "Ya podés vender. Completá los pasos restantes para operar con todo el potencial."
        : "Tu negocio está completamente activado.";

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in duration-500">
      <AdminPageHeader
        eyebrow="Activación · onboarding"
        title="Activación de tu negocio"
        subtitle={subtitle}
      />

      {/* Progress strip — premium variant of the previous bar */}
      <div className="mb-10 rounded-[var(--r-xl)] border border-[color:var(--card-border)] bg-[var(--surface-paper)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-5">
              Progreso de activación
            </span>
            <p className="mt-2 tabular text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink-0">
              {score}
              <span className="ml-1 text-[18px] font-medium text-ink-5">%</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-5">
              Pasos completos
            </span>
            <p className="mt-2 tabular text-[20px] font-semibold tracking-[-0.02em] text-ink-0">
              {completedSteps} <span className="text-ink-5">/ {totalSteps}</span>
            </p>
          </div>
        </div>
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-all duration-1000 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Tier groups */}
      <div className="space-y-8">
        {tierGroups.map(({ tier, steps: tierSteps }) => {
          const meta = TIER_META[tier];
          return (
            <div key={tier}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", meta.color)}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-ink-6 font-semibold">
                  {tierSteps.filter((s) => s.status === "completed").length}/{tierSteps.length}
                </span>
              </div>
              <div className="space-y-3">
                {tierSteps.map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activation complete */}
      {score === 100 && (
        <div className="mt-10 bg-[var(--accent-50)] border border-[var(--accent-200)] text-[var(--accent-700)] p-5 rounded-[var(--r-xl)] flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[14px]">Negocio activado</h3>
            <p className="mt-1 text-[12px]">
              Todos los motores están conectados. El dashboard mostrará métricas operativas y alertas en tiempo real.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ step }: { step: ActivationStep }) {
  const isBlocked = step.status === "blocked";
  const isDone = step.status === "completed";

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[var(--r-md)] border transition-all",
        isDone
          ? "bg-[var(--surface-2)] border-[color:var(--hairline)]"
          : isBlocked
            ? "bg-[var(--surface-2)] border-dashed border-[color:var(--hairline)] opacity-60"
            : "bg-[var(--surface-0)] border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-soft)]"
      )}
    >
      <div className="flex gap-4 min-w-0">
        <div className="mt-0.5 shrink-0">
          <StatusIcon status={step.status} />
        </div>
        <div className="min-w-0">
          <h3
            className={cn(
              "font-bold text-[14px] leading-snug",
              isDone ? "text-ink-5" : isBlocked ? "text-ink-6" : "text-ink-0"
            )}
          >
            {step.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-ink-5 leading-relaxed">
            {step.description}
          </p>
          {step.detail && (
            <p className="mt-1 text-[10px] font-medium text-ink-6 italic">
              {step.detail}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 md:mt-0 md:ml-4 shrink-0">
        {isBlocked ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-7">
            <Lock className="h-3 w-3" />
            Bloqueado
          </span>
        ) : isDone ? (
          <Link
            href={step.href}
            className="text-[11px] font-semibold text-ink-6 hover:text-ink-0 transition-colors"
          >
            Revisar
          </Link>
        ) : (
          <Link
            href={step.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-0 px-5 py-2 text-[12px] font-semibold text-ink-12 transition-colors hover:bg-ink-2"
          >
            {step.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ActivationStepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-[color:var(--signal-success)]" />;
    case "in_progress":
      return <AlertTriangle className="h-5 w-5 text-[color:var(--signal-warning)]" />;
    case "blocked":
      return <Lock className="h-5 w-5 text-ink-6" />;
    case "pending":
    default:
      return <Circle className="h-5 w-5 text-ink-6" />;
  }
}
