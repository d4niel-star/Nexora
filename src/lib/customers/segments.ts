// ─── Customer Segmentation Engine (Phase 7C.1) ───────────────────────
// Deterministic, transparent rules over already-aggregated customer
// stats. NO AI scoring, NO ML, NO opaque thresholds — every condition
// is documented inline so an admin can reason about why a customer
// landed in a segment. Each segment is a pure function:
//   classify(stats) -> SegmentTag[]
// A customer can have multiple tags (VIP + at-risk is a real signal).

export interface CustomerStats {
  email: string;
  totalOrders: number;
  lifetimeValue: number;
  refundedTotal: number;
  cancellationRate: number; // 0..1
  /** ISO timestamp of the last non-cancelled order; null if no orders. */
  lastOrderAt: string | null;
  /** ISO timestamp of the first order; null if no orders. */
  firstOrderAt: string | null;
  /** Count of carts that reached `abandoned` status. */
  abandonedCarts: number;
  /** Currency for value comparisons. ARS by default. */
  currency: string;
}

export type SegmentId =
  | "vip"
  | "high_value"
  | "at_risk"
  | "repeat_buyer"
  | "one_time_buyer"
  | "recently_active"
  | "churned"
  | "discount_dependent"   // — DEFERRED: requires discount-code telemetry
  | "high_refund_risk"
  | "wholesale_candidate";

export interface SegmentDefinition {
  id: SegmentId;
  label: string;
  description: string;
  /** Tailwind-friendly tone for badges. Maps to existing signal tokens. */
  color: "violet" | "blue" | "amber" | "rose" | "slate" | "emerald" | "indigo";
  /** Set when the segment depends on telemetry that isn't wired yet. */
  unavailable?: { reason: string };
}

// ─── Thresholds (currency-agnostic; in store's primary currency) ───
// We tune defaults for ARS but the values are sensible orders of
// magnitude. Storefronts on USD will read VIP at $1.5K LTV which is
// also reasonable. A future iteration can pull these from
// StoreSettings for per-merchant tuning.
const VIP_LTV_THRESHOLD = 150_000;
const VIP_ORDERS_THRESHOLD = 5;
const HIGH_VALUE_LTV_THRESHOLD = 60_000;
const WHOLESALE_AOV_THRESHOLD = 50_000; // High AOV signals B2B-style buys
const HIGH_REFUND_RATE = 0.25;

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENTLY_ACTIVE_DAYS = 14;
const AT_RISK_DAYS_MIN = 60;
const AT_RISK_DAYS_MAX = 120;
const CHURNED_DAYS = 180;

export const SEGMENT_DEFINITIONS: Record<SegmentId, SegmentDefinition> = {
  vip: {
    id: "vip",
    label: "VIP",
    description: `LTV > ${VIP_LTV_THRESHOLD.toLocaleString()} o ${VIP_ORDERS_THRESHOLD}+ pedidos.`,
    color: "violet",
  },
  high_value: {
    id: "high_value",
    label: "Alto valor",
    description: `LTV entre ${HIGH_VALUE_LTV_THRESHOLD.toLocaleString()} y VIP.`,
    color: "indigo",
  },
  at_risk: {
    id: "at_risk",
    label: "En riesgo",
    description: `Sin compra hace ${AT_RISK_DAYS_MIN}–${AT_RISK_DAYS_MAX} días, históricamente recurrente.`,
    color: "amber",
  },
  repeat_buyer: {
    id: "repeat_buyer",
    label: "Recurrente",
    description: "2 o más pedidos no cancelados.",
    color: "blue",
  },
  one_time_buyer: {
    id: "one_time_buyer",
    label: "Una sola compra",
    description: "Exactamente 1 pedido no cancelado.",
    color: "slate",
  },
  recently_active: {
    id: "recently_active",
    label: "Activo reciente",
    description: `Compró en los últimos ${RECENTLY_ACTIVE_DAYS} días.`,
    color: "emerald",
  },
  churned: {
    id: "churned",
    label: "Churneado",
    description: `Sin compra hace más de ${CHURNED_DAYS} días.`,
    color: "slate",
  },
  discount_dependent: {
    id: "discount_dependent",
    label: "Depende de descuentos",
    description: "Histórico de compras siempre con cupón aplicado.",
    color: "rose",
    unavailable: {
      reason: "Telemetría de cupones por pedido aún no está expuesta — diferido.",
    },
  },
  high_refund_risk: {
    id: "high_refund_risk",
    label: "Alto riesgo de reembolso",
    description: `Más del ${Math.round(HIGH_REFUND_RATE * 100)}% del LTV reembolsado.`,
    color: "rose",
  },
  wholesale_candidate: {
    id: "wholesale_candidate",
    label: "Candidato a mayorista",
    description: `AOV > ${WHOLESALE_AOV_THRESHOLD.toLocaleString()} con 2+ pedidos.`,
    color: "indigo",
  },
};

export function classifyCustomer(stats: CustomerStats): SegmentId[] {
  const tags: SegmentId[] = [];
  const now = Date.now();
  const lastMs = stats.lastOrderAt ? new Date(stats.lastOrderAt).getTime() : null;
  const daysSinceLast = lastMs ? Math.floor((now - lastMs) / DAY_MS) : null;
  const aov = stats.totalOrders > 0 ? stats.lifetimeValue / stats.totalOrders : 0;
  const refundRate = stats.lifetimeValue > 0 ? stats.refundedTotal / stats.lifetimeValue : 0;

  // ── VIP / value tiers (mutually exclusive on the value axis) ──
  if (stats.lifetimeValue >= VIP_LTV_THRESHOLD || stats.totalOrders >= VIP_ORDERS_THRESHOLD) {
    tags.push("vip");
  } else if (stats.lifetimeValue >= HIGH_VALUE_LTV_THRESHOLD) {
    tags.push("high_value");
  }

  // ── Recurrence axis ──
  if (stats.totalOrders >= 2) tags.push("repeat_buyer");
  else if (stats.totalOrders === 1) tags.push("one_time_buyer");

  // ── Activity axis ──
  if (daysSinceLast !== null) {
    if (daysSinceLast <= RECENTLY_ACTIVE_DAYS) {
      tags.push("recently_active");
    } else if (daysSinceLast >= CHURNED_DAYS) {
      tags.push("churned");
    } else if (
      daysSinceLast >= AT_RISK_DAYS_MIN &&
      daysSinceLast <= AT_RISK_DAYS_MAX &&
      stats.totalOrders >= 2
    ) {
      tags.push("at_risk");
    }
  }

  // ── Risk signals ──
  if (refundRate > HIGH_REFUND_RATE && stats.lifetimeValue > 0) {
    tags.push("high_refund_risk");
  }

  // ── Wholesale candidate ──
  if (aov >= WHOLESALE_AOV_THRESHOLD && stats.totalOrders >= 2) {
    tags.push("wholesale_candidate");
  }

  // discount_dependent intentionally not added — telemetry deferred.

  return tags;
}

/** Convenience: human-readable list of segment labels for a customer. */
export function segmentLabels(stats: CustomerStats): string[] {
  return classifyCustomer(stats).map((id) => SEGMENT_DEFINITIONS[id].label);
}
