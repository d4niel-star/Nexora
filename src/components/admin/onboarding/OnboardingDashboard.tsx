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
import { NexoraPageHeader, NexoraStatRow } from "@/components/admin/nexora";

// ─── OnboardingDashboard · Studio v4 ─────────────────────────────────────
//
// What `/admin/dashboard` renders for any new merchant whose store
// hasn't been fully activated yet (most users on a fresh signup).
// Studio v4 ships:
//   · Compact NexoraPageHeader inline (no eyebrow, no display title).
//   · A flat `nx-stat-row` with progress / completed / blockers (no
//     shadowed "premium card" chrome any more).
//   · Hairline-bound progress bar inline.
//   · Tier groups rendered as flat hairline rows, no rounded shadow
//     panels per tier.
//   · Step rows are `nx-table`-style: row hover, hairline divider,
//     no individual card-with-shadow per step.

const TIER_META: Record<ActivationTier, { label: string; color: string }> = {
  blocker: { label: "Requisito", color: "var(--signal-danger)" },
  accelerator: { label: "Acelerador", color: "var(--signal-warning)" },
  recommended: { label: "Recomendado", color: "var(--accent-500)" },
};

export function OnboardingDashboard({ data }: { data: ActivationState }) {
  const { steps, score, completedSteps, totalSteps, blockers } = data;

  const allTiers: ActivationTier[] = ["blocker", "accelerator", "recommended"];
  const tierGroups = allTiers
    .map((tier) => ({ tier, steps: steps.filter((s) => s.tier === tier) }))
    .filter((g) => g.steps.length > 0);

  const subtitle =
    blockers > 0
      ? `Hay ${blockers} paso${blockers !== 1 ? "s" : ""} bloqueante${blockers !== 1 ? "s" : ""} para empezar a vender.`
      : score < 100
        ? "Ya podés vender. Completá los pasos restantes para operar con todo el potencial."
        : "Tu negocio está completamente activado.";

  return (
    <div className="animate-in fade-in duration-300">
      <NexoraPageHeader
        title="Activación de tu negocio"
        subtitle={subtitle}
        status={
          blockers > 0
            ? { label: `${blockers} bloqueante${blockers !== 1 ? "s" : ""}`, tone: "danger" }
            : score < 100
              ? { label: `${score}% completo`, tone: "warning" }
              : { label: "Activado", tone: "success" }
        }
      />

      {/* Flat progress band — hairline-divided, no shadow */}
      <NexoraStatRow
        cols={3}
        stats={[
          { label: "Progreso", value: `${score}%` },
          { label: "Pasos completos", value: `${completedSteps}/${totalSteps}` },
          { label: "Bloqueantes", value: String(blockers), hint: blockers > 0 ? "Pasos requeridos" : "Sin bloqueantes" },
        ]}
      />

      {/* Hairline progress bar */}
      <div
        style={{
          marginTop: 16,
          height: 4,
          width: "100%",
          background: "var(--studio-row-hover)",
          borderRadius: 999,
          overflow: "hidden",
        }}
        aria-label={`Progreso ${score}%`}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: "var(--brand)",
            transition: "width 1s ease-out",
            borderRadius: 999,
          }}
        />
      </div>

      {/* Tier groups — flat hairline-bound sections */}
      <div className="mt-8 space-y-6">
        {tierGroups.map(({ tier, steps: tierSteps }) => {
          const meta = TIER_META[tier];
          const completed = tierSteps.filter((s) => s.status === "completed").length;
          return (
            <section
              key={tier}
              style={{
                border: "1px solid var(--studio-line)",
                borderRadius: 8,
                background: "var(--studio-paper)",
                overflow: "hidden",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--studio-line)",
                  background: "var(--studio-paper-soft)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: meta.color,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)" }}>
                    {meta.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-5)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {completed}/{tierSteps.length}
                </span>
              </header>
              <ul>
                {tierSteps.map((step, i) => (
                  <li
                    key={step.id}
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--studio-line)",
                    }}
                  >
                    <StepRow step={step} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Activation complete */}
      {score === 100 && (
        <div
          className="mt-6 flex items-start gap-3"
          style={{
            border: "1px solid var(--studio-line)",
            borderRadius: 8,
            background: "rgba(46, 132, 89, 0.08)",
            padding: "14px 16px",
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#2e8459" }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#2e8459" }}>
              Negocio activado
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              Todos los motores están conectados. El dashboard mostrará métricas operativas
              y alertas en tiempo real.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ step }: { step: ActivationStep }) {
  const isBlocked = step.status === "blocked";
  const isDone = step.status === "completed";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 transition-colors",
        !isBlocked && !isDone && "hover:bg-[var(--studio-row-hover)]",
      )}
      style={isBlocked ? { opacity: 0.55 } : undefined}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">
          <StatusIcon status={step.status} />
        </div>
        <div className="min-w-0">
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isDone ? "var(--ink-5)" : isBlocked ? "var(--ink-6)" : "var(--ink-0)",
              lineHeight: 1.4,
            }}
          >
            {step.title}
          </p>
          <p
            style={{
              marginTop: 2,
              fontSize: 12,
              color: "var(--ink-5)",
              lineHeight: 1.5,
            }}
          >
            {step.description}
          </p>
          {step.detail ? (
            <p
              style={{
                marginTop: 2,
                fontSize: 11,
                fontStyle: "italic",
                color: "var(--ink-6)",
              }}
            >
              {step.detail}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0">
        {isBlocked ? (
          <span
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: 11.5, color: "var(--ink-6)", fontWeight: 500 }}
          >
            <Lock className="h-3 w-3" />
            Bloqueado
          </span>
        ) : isDone ? (
          <Link
            href={step.href}
            className="nx-action nx-action--ghost nx-action--sm"
          >
            Revisar
          </Link>
        ) : (
          <Link href={step.href} className="nx-action nx-action--primary nx-action--sm">
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
      return <CheckCircle2 className="h-4 w-4 text-[color:var(--signal-success)]" />;
    case "in_progress":
      return <AlertTriangle className="h-4 w-4 text-[color:var(--signal-warning)]" />;
    case "blocked":
      return <Lock className="h-4 w-4 text-ink-6" />;
    case "pending":
    default:
      return <Circle className="h-4 w-4 text-ink-6" />;
  }
}
