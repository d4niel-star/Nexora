import { prisma } from "@/lib/db/prisma";
import { hasMercadoPagoConnected } from "@/lib/payments/mercadopago/tenant";

// ─── Storefront trust signals ───────────────────────────────────────────
// Every signal returned here is derived from a real DB row or route that
// actually exists. There is NO fake social proof, NO scarcity, NO "23
// people are viewing this", NO "popular" badges and NO urgency copy.
//
// Rules:
//   * hasMercadoPago: true only when the tenant completed OAuth and the
//     connection is connected (checked via hasMercadoPagoConnected).
//   * freeShippingThreshold: surfaced only when at least one active
//     shipping method declares freeShippingOver. We pick the LOWEST
//     threshold across active methods so the message stays honest
//     ("desde $X" is the best available deal the buyer can reach).
//   * hasReturnsPolicy: the arrepentimiento page is a platform-level
//     route that exists for every Nexora store, so this is always
//     true — but we keep it as a signal so surfaces render it the
//     same way as the others.

export interface StorefrontTrustSignals {
  hasMercadoPago: boolean;
  freeShippingThreshold: number | null;
  hasReturnsPolicy: boolean;
  currency: string;
  locale: string;
}

export async function getStorefrontTrustSignals(
  storeId: string,
  storeCurrency: string,
  storeLocale: string,
): Promise<StorefrontTrustSignals> {
  const [mpConnected, freeShippingMethods] = await Promise.all([
    hasMercadoPagoConnected(storeId).catch(() => false),
    prisma.shippingMethod
      .findMany({
        where: {
          storeId,
          isActive: true,
          freeShippingOver: { not: null, gt: 0 },
        },
        select: { freeShippingOver: true },
      })
      .catch(() => []),
  ]);

  // Lowest threshold across active methods — honest "easiest path to
  // free shipping". Null when no method offers free shipping.
  const lowestThreshold = freeShippingMethods.reduce<number | null>((min, m) => {
    if (m.freeShippingOver == null) return min;
    if (min == null) return m.freeShippingOver;
    return m.freeShippingOver < min ? m.freeShippingOver : min;
  }, null);

  return {
    hasMercadoPago: mpConnected,
    freeShippingThreshold: lowestThreshold,
    // arrepentimiento route exists platform-wide — always true, but we
    // expose it here so surfaces have a single source of truth.
    hasReturnsPolicy: true,
    currency: storeCurrency,
    locale: storeLocale,
  };
}
