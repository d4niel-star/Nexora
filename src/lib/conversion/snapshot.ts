// ─── Conversion Module · Data Layer ──────────────────────────────────────
//
// Powers the /admin/conversion surface inside the Estadísticas family.
// This is the analytical replacement for the legacy "Diagnóstico" sub-tab,
// which was operational/readiness in nature and didn't belong under
// Estadísticas.
//
// What we measure (only with real signals already captured by the system):
//   1. Carritos con ítems   — Cart rows with at least one CartItem
//   2. Checkout iniciado    — CheckoutDraft rows linked to those carts
//   3. Pedido generado      — Order rows created in range (any status)
//   4. Pago confirmado      — Order rows with paymentStatus paid|approved
//
// What we explicitly do NOT measure (would require event/session tracking
// that the platform does not capture today):
//   · Visitas a la tienda → carrito  (no session log)
//   · Vistas de producto / colección  (no analytics events)
//   · Tiempo en checkout / abandono por paso
//
// The UI must present this gap honestly, not invent it. The snapshot
// includes a `dataLimitations` array that the page renders as a discreet
// "qué falta medir" note.

import { prisma } from "@/lib/db/prisma";
import { resolveStatsRange } from "@/lib/stats/queries";

export interface ConversionStage {
  /** Stable id used for keys / styling. */
  id: "carts" | "checkouts" | "orders" | "paid";
  /** Short label rendered next to the bar. */
  label: string;
  /** One-line explanation of what this stage represents. */
  description: string;
  /** Absolute count for the current period. */
  value: number;
  /** Conversion rate from the previous stage (0–1). Null on stage 0. */
  rateFromPrev: number | null;
  /** Conversion rate from the funnel head (0–1). */
  rateFromTop: number | null;
  /** Drop-off count from the previous stage (>= 0). Null on stage 0. */
  dropFromPrev: number | null;
}

export interface ConversionFrictionPoint {
  /** Human label of the transition that lost the most users. */
  label: string;
  /** Volume lost between two stages. */
  drop: number;
  /** % of the previous stage that did not advance. */
  ratio: number;
}

export interface ConversionPaymentFailure {
  /** Raw paymentStatus value as stored in Order. */
  status: string;
  /** Human label for the status. */
  label: string;
  /** Order count with that status in the current range. */
  count: number;
}

export interface ConversionDataLimitation {
  title: string;
  description: string;
}

export interface ConversionSnapshot {
  range: { from: string; to: string };
  prevRange: { from: string; to: string };
  rangeDays: number;
  stages: readonly ConversionStage[];
  /** Overall cart → paid conversion (0–1). Null if no carts in range. */
  overallRate: number | null;
  /** Same metric for the previous equal-length window. */
  prevOverallRate: number | null;
  /** Largest drop-off across the funnel transitions. Null if no carts. */
  primaryFriction: ConversionFrictionPoint | null;
  /** Failed / rejected / cancelled-payment orders, grouped by status. */
  paymentFailures: readonly ConversionPaymentFailure[];
  /** True iff there is enough data to draw something meaningful. */
  hasMeasurableFlow: boolean;
  dataLimitations: readonly ConversionDataLimitation[];
}

const PAYMENT_FAILURE_LABELS: Record<string, string> = {
  failed: "Falló",
  rejected: "Rechazado",
  cancelled_payment: "Cancelado",
  pending: "Pendiente",
  in_process: "En proceso",
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export async function getConversionSnapshot(
  storeId: string,
  args: { from?: string | null; to?: string | null } = {},
): Promise<ConversionSnapshot> {
  const range = resolveStatsRange(args.from, args.to);
  const prevTo = new Date(range.from.getTime());
  const prevFrom = new Date(range.from.getTime() - range.days * 86_400_000);

  const sid = storeId;

  const [
    cartsWithItems,
    checkoutsStarted,
    ordersCount,
    paidCount,
    prevCartsWithItems,
    prevPaidCount,
    failureBuckets,
  ] = await Promise.all([
    // Carts created in range that actually have at least one item.
    // We count them via the join on CartItem to avoid empty-cart noise
    // (a session can open a Cart row before adding anything).
    prisma.cart.count({
      where: {
        storeId: sid,
        createdAt: { gte: range.from, lt: range.toExclusive },
        items: { some: {} },
      },
    }),
    // Checkout drafts whose underlying cart was created in range. The
    // draft row itself can be created later, so we anchor on the cart's
    // creation date to keep the funnel comparable.
    prisma.checkoutDraft.count({
      where: {
        storeId: sid,
        cart: {
          storeId: sid,
          createdAt: { gte: range.from, lt: range.toExclusive },
          items: { some: {} },
        },
      },
    }),
    // Orders generated in range, regardless of payment status. This is
    // the "completed checkout" stage.
    prisma.order.count({
      where: {
        storeId: sid,
        createdAt: { gte: range.from, lt: range.toExclusive },
      },
    }),
    // Orders with confirmed payment.
    prisma.order.count({
      where: {
        storeId: sid,
        createdAt: { gte: range.from, lt: range.toExclusive },
        paymentStatus: { in: ["approved", "paid"] },
        status: { notIn: ["cancelled", "refunded"] },
      },
    }),
    // Previous-period carts with items (for overall comparison).
    prisma.cart.count({
      where: {
        storeId: sid,
        createdAt: { gte: prevFrom, lt: prevTo },
        items: { some: {} },
      },
    }),
    // Previous-period paid orders.
    prisma.order.count({
      where: {
        storeId: sid,
        createdAt: { gte: prevFrom, lt: prevTo },
        paymentStatus: { in: ["approved", "paid"] },
        status: { notIn: ["cancelled", "refunded"] },
      },
    }),
    // Payment-status breakdown for orders generated in range whose
    // payment didn't go through. These are real recoverable signals
    // (matched to the Recuperación surface) and also explain the
    // last-mile drop in the funnel.
    prisma.order.groupBy({
      by: ["paymentStatus"],
      where: {
        storeId: sid,
        createdAt: { gte: range.from, lt: range.toExclusive },
        paymentStatus: {
          in: ["failed", "rejected", "cancelled_payment", "pending", "in_process"],
        },
      },
      _count: true,
    }),
  ]);

  // Build the funnel.
  const stagesRaw: Array<{
    id: ConversionStage["id"];
    label: string;
    description: string;
    value: number;
  }> = [
    {
      id: "carts",
      label: "Carritos con ítems",
      description: "Visitas que agregaron al menos un producto.",
      value: cartsWithItems,
    },
    {
      id: "checkouts",
      label: "Checkout iniciado",
      description: "Carritos que avanzaron al formulario de pago.",
      value: checkoutsStarted,
    },
    {
      id: "orders",
      label: "Pedido generado",
      description: "Checkouts que completaron el pedido (pago no requerido).",
      value: ordersCount,
    },
    {
      id: "paid",
      label: "Pago confirmado",
      description: "Pedidos con pago aprobado por el procesador.",
      value: paidCount,
    },
  ];

  const head = stagesRaw[0]?.value ?? 0;
  const stages: ConversionStage[] = stagesRaw.map((s, i) => {
    const prev = i === 0 ? null : stagesRaw[i - 1].value;
    const rateFromPrev = prev === null ? null : ratio(s.value, prev);
    const rateFromTop = i === 0 ? null : ratio(s.value, head);
    const dropFromPrev = prev === null ? null : Math.max(0, prev - s.value);
    return {
      ...s,
      rateFromPrev,
      rateFromTop,
      dropFromPrev,
    };
  });

  // Identify the biggest drop-off transition (in absolute terms, but
  // tie-breaking by ratio so a 80→20 drop on small volume still wins
  // over a 100→90 drop on large volume).
  let primaryFriction: ConversionFrictionPoint | null = null;
  for (let i = 1; i < stagesRaw.length; i++) {
    const prevValue = stagesRaw[i - 1].value;
    const drop = Math.max(0, prevValue - stagesRaw[i].value);
    if (drop <= 0 || prevValue <= 0) continue;
    const dropRatio = drop / prevValue;
    const transitionLabel = `${stagesRaw[i - 1].label} → ${stagesRaw[i].label}`;
    if (
      primaryFriction === null ||
      dropRatio > primaryFriction.ratio ||
      (dropRatio === primaryFriction.ratio && drop > primaryFriction.drop)
    ) {
      primaryFriction = { label: transitionLabel, drop, ratio: dropRatio };
    }
  }

  const paymentFailures: ConversionPaymentFailure[] = failureBuckets
    .map((b) => ({
      status: b.paymentStatus,
      label: PAYMENT_FAILURE_LABELS[b.paymentStatus] ?? b.paymentStatus,
      count: b._count,
    }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const dataLimitations: ConversionDataLimitation[] = [
    {
      title: "Visitas y vistas de producto",
      description:
        "El sistema todavía no captura sesiones ni vistas de página, así que el embudo arranca desde el carrito (no desde la visita).",
    },
    {
      title: "Abandono por paso del checkout",
      description:
        "Sólo medimos checkout iniciado vs. pedido generado. El detalle paso por paso (datos personales, envío, pago) requeriría eventos del front que aún no se registran.",
    },
  ];

  return {
    range: { from: toISODate(range.from), to: toISODate(range.to) },
    prevRange: {
      from: toISODate(prevFrom),
      to: toISODate(new Date(prevTo.getTime() - 86_400_000)),
    },
    rangeDays: range.days,
    stages,
    overallRate: ratio(paidCount, cartsWithItems),
    prevOverallRate: ratio(prevPaidCount, prevCartsWithItems),
    primaryFriction,
    paymentFailures,
    hasMeasurableFlow: cartsWithItems > 0 || ordersCount > 0,
    dataLimitations,
  };
}
