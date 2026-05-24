import type { CustomerStats } from "./segments";

// ─── Customer Health Indicator (Phase 7C.4) ──────────────────────────
// Deterministic, transparent rule. The output is a 4-state label, NOT
// a score (no AI, no opaque ML). The same inputs always yield the same
// output and the rule is auditable by reading this file.

export type CustomerHealth = "healthy" | "neutral" | "at_risk" | "declining";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HealthInput {
  stats: CustomerStats;
  /** Open support tickets / RefundRequests still pending. */
  openSupportItems?: number;
}

export interface HealthVerdict {
  level: CustomerHealth;
  /** Plain-text rationale shown in the UI for transparency. */
  rationale: string;
  signals: {
    daysSinceLastOrder: number | null;
    refundRate: number; // 0..1
    cancellationRate: number; // 0..1
    repeatBuyer: boolean;
    openSupportItems: number;
  };
}

export function classifyHealth(input: HealthInput): HealthVerdict {
  const { stats } = input;
  const openSupportItems = input.openSupportItems ?? 0;

  const lastMs = stats.lastOrderAt ? new Date(stats.lastOrderAt).getTime() : null;
  const daysSinceLastOrder = lastMs
    ? Math.floor((Date.now() - lastMs) / DAY_MS)
    : null;

  const refundRate = stats.lifetimeValue > 0
    ? stats.refundedTotal / stats.lifetimeValue
    : 0;

  const repeatBuyer = stats.totalOrders >= 2;

  // ── Hard signals (declining) ──
  // Multiple cancellations + recent refunds + open tickets means the
  // relationship is actively deteriorating.
  if (stats.cancellationRate >= 0.5 && stats.totalOrders >= 2) {
    return verdict("declining", "Más del 50% de los pedidos terminaron cancelados.", { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
  }
  if (refundRate >= 0.4) {
    return verdict("declining", "Más del 40% del LTV fue reembolsado.", { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
  }

  // ── At-risk signals ──
  if (daysSinceLastOrder !== null && daysSinceLastOrder >= 90 && repeatBuyer) {
    return verdict("at_risk", "Cliente recurrente sin compras hace 3+ meses.", { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
  }
  if (refundRate >= 0.2) {
    return verdict("at_risk", "20%+ del LTV reembolsado.", { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
  }
  if (openSupportItems >= 2) {
    return verdict("at_risk", `${openSupportItems} casos de soporte abiertos.`, { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
  }

  // ── Healthy signals ──
  if (repeatBuyer && refundRate < 0.05 && stats.cancellationRate < 0.1) {
    if (daysSinceLastOrder !== null && daysSinceLastOrder <= 60) {
      return verdict("healthy", "Cliente recurrente, baja fricción y compras recientes.", { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
    }
  }

  // ── Default ──
  return verdict("neutral", "Sin señales fuertes en ninguna dirección.", { daysSinceLastOrder, refundRate, cancellationRate: stats.cancellationRate, repeatBuyer, openSupportItems });
}

function verdict(
  level: CustomerHealth,
  rationale: string,
  signals: HealthVerdict["signals"],
): HealthVerdict {
  return { level, rationale, signals };
}

export const HEALTH_LABELS: Record<CustomerHealth, { label: string; tone: "ok" | "neutral" | "warn" | "danger" }> = {
  healthy: { label: "Saludable", tone: "ok" },
  neutral: { label: "Neutral", tone: "neutral" },
  at_risk: { label: "En riesgo", tone: "warn" },
  declining: { label: "Decayendo", tone: "danger" },
};
