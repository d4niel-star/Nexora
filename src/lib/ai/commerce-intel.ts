// ─── Commerce / merchandising intelligence signals ──────────────────────
//
// The existing CommandCenter already covers velocity, margin, stock,
// sourcing, and catalog completeness (missing image / missing
// description). This helper fills the only big remaining gap: honest
// merchandising + growth-linked signals derived from real rows.
//
// Every signal here is either a direct prisma query or a cross-product
// of velocity (already computed upstream) × DB state. There are no
// scores, no ML, no "AI-detected opportunity" — just explicit rules
// that the merchant can audit on screen.
//
// Signals returned:
//   * noPricePublished — products marked isPublished=true with price
//     <= 0. Storefront lists them as "Consultar precio" today, which
//     is a silent drop in conversion.
//   * noVariantsPublished — isPublished=true with zero rows in
//     ProductVariant. The PDP can still render but AddToCartForm has
//     no variant to add, so the product literally cannot be sold.
//   * winnersWithoutReviews — top sellers (by units sold in the last
//     30 days from the velocity report) that have ZERO approved
//     ProductReview rows. Real cross-link between growth and catalog.
//   * winnersWithoutBundles — top sellers that are NOT the
//     triggerProduct of any active BundleOffer. Only surfaced when
//     the bundles-upsells app is actually installed+active; we do
//     not nudge merchants to create offers on an app they never
//     chose to install.
//   * noCompareAtHighRotation — high-rotation products with
//     compareAtPrice = null. This is a soft merchandising signal
//     (anchor price missing on a winner) — never a blocker.

import { prisma } from "@/lib/db/prisma";
import type { VelocityReport } from "@/types/velocity";

export interface CommerceProductRef {
  productId: string;
  title: string;
  /** Units sold in the last 30 days from the velocity report, when
   *  available. Null for signals that don't depend on velocity. */
  units30d: number | null;
}

export interface CommerceIntelligence {
  noPricePublished: CommerceProductRef[];
  noVariantsPublished: CommerceProductRef[];
  winnersWithoutReviews: CommerceProductRef[];
  winnersWithoutBundles: CommerceProductRef[];
  noCompareAtHighRotation: CommerceProductRef[];
  /** True iff InstalledApp row exists with status=active for the slug. */
  bundlesAppActive: boolean;
  reviewsAppActive: boolean;
}

const EMPTY: CommerceIntelligence = {
  noPricePublished: [],
  noVariantsPublished: [],
  winnersWithoutReviews: [],
  winnersWithoutBundles: [],
  noCompareAtHighRotation: [],
  bundlesAppActive: false,
  reviewsAppActive: false,
};

// Upper cap on how many winners we cross-reference. The CommandCenter
// only needs a sample per directive; iterating 10 top sellers is
// enough signal without exploding the query fan-out for every
// dashboard load.
const WINNERS_SAMPLE_LIMIT = 10;

export async function getCommerceIntelligence(
  storeId: string | null,
  velocity?: VelocityReport,
): Promise<CommerceIntelligence> {
  if (!storeId) return EMPTY;

  // Build the "winners" set from velocity (already computed upstream
  // as part of the CommandCenter parallel fetch). We intentionally
  // reuse velocity's own paid-orders filter instead of re-querying
  // orders — a single source of truth for what counts as a "winner".
  const winnersSource = (velocity?.products ?? [])
    .map((p) => {
      const w30 = p.windows.find((w) => w.days === 30);
      return {
        productId: p.productId,
        title: p.title,
        units30d: w30?.unitsSold ?? 0,
        rotation: p.rotation,
      };
    })
    .filter((p) => p.productId && p.units30d > 0)
    .sort((a, b) => b.units30d - a.units30d)
    .slice(0, WINNERS_SAMPLE_LIMIT);

  const winnerIds = winnersSource.map((p) => p.productId);

  const [
    noPricePubRaw,
    noVariantsPubRaw,
    reviewsByProduct,
    bundleTriggerIds,
    bundlesApp,
    reviewsApp,
    noCompareAtCandidatesRaw,
  ] = await Promise.all([
    // No price + published
    prisma.product.findMany({
      where: { storeId, isPublished: true, price: { lte: 0 } },
      select: { id: true, title: true },
      take: 50,
    }),
    // No variants + published. Prisma doesn't allow "none" without a
    // relational filter, so we count via `every` against a null
    // predicate — every variant matches "id: undefined" when there
    // are zero variants at all.
    prisma.product.findMany({
      where: {
        storeId,
        isPublished: true,
        variants: { none: {} },
      },
      select: { id: true, title: true },
      take: 50,
    }),
    // Group reviews by product for the winners set only (bounded
    // fan-out). We look at BOTH approved and pending because a
    // merchant with pending-only reviews should be nudged to
    // moderate, not to "collect reviews" — but for this helper we
    // care about APPROVED, which is what storefront renders.
    winnerIds.length > 0
      ? prisma.productReview.groupBy({
          by: ["productId"],
          where: {
            storeId,
            productId: { in: winnerIds },
            status: "approved",
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as Array<{ productId: string; _count: { _all: number } }>),
    // Which winner IDs are already the triggerProduct of an ACTIVE
    // bundle? Anything outside this set is a "winner without bundle".
    winnerIds.length > 0
      ? prisma.bundleOffer.findMany({
          where: {
            storeId,
            status: "active",
            triggerProductId: { in: winnerIds },
          },
          select: { triggerProductId: true },
        })
      : Promise.resolve([] as Array<{ triggerProductId: string }>),
    prisma.installedApp.findUnique({
      where: { storeId_appSlug: { storeId, appSlug: "bundles-upsells" } },
      select: { status: true },
    }),
    prisma.installedApp.findUnique({
      where: { storeId_appSlug: { storeId, appSlug: "product-reviews" } },
      select: { status: true },
    }),
    // High-rotation candidates without compareAt. We scan the winners
    // list (bounded set), then filter below with the real Product
    // row. Kept as a single findMany to avoid N+1.
    winnerIds.length > 0
      ? prisma.product.findMany({
          where: { storeId, id: { in: winnerIds } },
          select: { id: true, title: true, compareAtPrice: true, price: true },
        })
      : Promise.resolve(
          [] as Array<{
            id: string;
            title: string;
            compareAtPrice: number | null;
            price: number;
          }>,
        ),
  ]);

  const bundlesAppActive = bundlesApp?.status === "active";
  const reviewsAppActive = reviewsApp?.status === "active";

  const reviewCountByProduct = new Map<string, number>();
  for (const row of reviewsByProduct) {
    reviewCountByProduct.set(row.productId, row._count._all);
  }
  const bundleTriggerIdSet = new Set(bundleTriggerIds.map((r) => r.triggerProductId));

  // Winners with zero approved reviews. Only meaningful when the
  // reviews app is actually installed — otherwise the CTA is "install
  // app", which is already covered by the /admin/growth surface.
  const winnersWithoutReviews: CommerceProductRef[] = reviewsAppActive
    ? winnersSource
        .filter((p) => (reviewCountByProduct.get(p.productId) ?? 0) === 0)
        .map((p) => ({
          productId: p.productId,
          title: p.title,
          units30d: p.units30d,
        }))
    : [];

  // Winners that are NOT the trigger of any active bundle. Only
  // emitted when the bundles app is active — same rationale as above.
  const winnersWithoutBundles: CommerceProductRef[] = bundlesAppActive
    ? winnersSource
        .filter((p) => !bundleTriggerIdSet.has(p.productId))
        .map((p) => ({
          productId: p.productId,
          title: p.title,
          units30d: p.units30d,
        }))
    : [];

  // Anchor-price missing on winners. Soft signal — only emitted for
  // products in rotation "high" per the velocity report, so we don't
  // nag merchants about compareAt on every single product in the
  // catalog.
  const highRotationWinnerIds = new Set(
    winnersSource.filter((p) => p.rotation === "high").map((p) => p.productId),
  );
  const noCompareAtHighRotation: CommerceProductRef[] = noCompareAtCandidatesRaw
    .filter(
      (p) =>
        highRotationWinnerIds.has(p.id) &&
        (p.compareAtPrice == null || p.compareAtPrice <= p.price),
    )
    .map((p) => {
      const w = winnersSource.find((w) => w.productId === p.id);
      return {
        productId: p.id,
        title: p.title,
        units30d: w?.units30d ?? null,
      };
    });

  return {
    noPricePublished: noPricePubRaw.map((p) => ({
      productId: p.id,
      title: p.title,
      units30d: null,
    })),
    noVariantsPublished: noVariantsPubRaw.map((p) => ({
      productId: p.id,
      title: p.title,
      units30d: null,
    })),
    winnersWithoutReviews,
    winnersWithoutBundles,
    noCompareAtHighRotation,
    bundlesAppActive,
    reviewsAppActive,
  };
}
