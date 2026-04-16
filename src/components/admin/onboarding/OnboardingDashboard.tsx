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

const TIER_META: Record<ActivationTier, { label: string; color: string }> = {
  blocker: { label: "Requisito", color: "text-red-600" },
  accelerator: { label: "Acelerador", color: "text-amber-600" },
  recommended: { label: "Recomendado", color: "text-blue-500" },
};

export function OnboardingDashboard({ data }: { data: ActivationState }) {
  const { steps, score, completedSteps, totalSteps, blockers } = data;

  const allTiers: ActivationTier[] = ["blocker", "accelerator", "recommended"];
  const tierGroups = allTiers
    .map((tier) => ({ tier, steps: steps.filter((s) => s.tier === tier) }))
    .filter((g) => g.steps.length > 0);

  return (
    <div className="mx-auto max-w-4xl pt-8 pb-16 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">
          Activación de tu negocio
        </h1>
        <p className="mt-2 text-[15px] text-[#555555] max-w-2xl leading-relaxed">
          {blockers > 0
            ? `Hay ${blockers} paso${blockers !== 1 ? "s" : ""} bloqueante${blockers !== 1 ? "s" : ""} para empezar a vender. Resolvelos primero.`
            : score < 100
              ? "Ya podés vender. Completá los pasos restantes para operar con todo el potencial."
              : "Tu negocio está completamente activado."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#111111]">
            Progreso de activación
          </h2>
          <span className="text-[13px] font-bold tabular-nums text-[#111111]">
            {completedSteps}/{totalSteps}
            <span className="ml-2 text-emerald-600">{score}%</span>
          </span>
        </div>
        <div className="w-full bg-[#f0f0f0] rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-1000 ease-out rounded-full"
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
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", meta.color)}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-[#BBBBBB] font-bold">
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
        <div className="mt-10 bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-[14px]">Negocio activado</h3>
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
        "flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border transition-all",
        isDone
          ? "bg-[#FAFAFA] border-[#E8E8E8]"
          : isBlocked
            ? "bg-[#FAFAFA] border-dashed border-[#DDDDDD] opacity-60"
            : "bg-white border-[#DDDDDD] hover:border-[#111111] hover:shadow-sm"
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
              isDone ? "text-[#888888]" : isBlocked ? "text-[#AAAAAA]" : "text-[#111111]"
            )}
          >
            {step.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-[#777777] leading-relaxed">
            {step.description}
          </p>
          {step.detail && (
            <p className="mt-1 text-[10px] font-medium text-[#AAAAAA] italic">
              {step.detail}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 md:mt-0 md:ml-4 shrink-0">
        {isBlocked ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#BBBBBB]">
            <Lock className="h-3 w-3" />
            Bloqueado
          </span>
        ) : isDone ? (
          <Link
            href={step.href}
            className="text-[11px] font-bold text-[#AAAAAA] hover:text-[#111111] transition-colors"
          >
            Revisar
          </Link>
        ) : (
          <Link
            href={step.href}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#111111] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-black"
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
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "in_progress":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "blocked":
      return <Lock className="h-5 w-5 text-[#CCCCCC]" />;
    case "pending":
    default:
      return <Circle className="h-5 w-5 text-[#CCCCCC]" />;
  }
}
