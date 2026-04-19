// ─── Product Reviews · Queries ───
// Strict pending-first read layer. Storefront sees ONLY approved rows;
// admin sees everything filtered by status. Aggregates are computed on
// demand from approved rows — nothing is cached, nothing is pre-filled.

import { prisma } from "@/lib/db/prisma";

export type ReviewStatus = "pending" | "approved" | "hidden";

export interface PublicReview {
  id: string;
  displayName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface AdminReview extends PublicReview {
  status: ReviewStatus;
  productId: string;
  productTitle: string;
  productHandle: string;
  moderatedAt: Date | null;
  source: string;
}

export interface ProductReviewAggregate {
  count: number;
  averageRating: number | null; // null when count === 0, never 0 or fake.
}

/**
 * Approved reviews for a given product. Used by the PDP block.
 */
export async function listApprovedReviews(
  storeId: string,
  productId: string,
  limit = 20,
): Promise<PublicReview[]> {
  const rows = await prisma.productReview.findMany({
    where: {
      storeId,
      productId,
      status: "approved",
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      displayName: true,
      rating: true,
      title: true,
      body: true,
      verifiedPurchase: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  return rows;
}

/**
 * Aggregate over APPROVED reviews only. Returns `{ count: 0, average: null }`
 * when empty so the caller never has to fake a rating.
 */
export async function getApprovedReviewAggregate(
  storeId: string,
  productId: string,
): Promise<ProductReviewAggregate> {
  const grouped = await prisma.productReview.aggregate({
    where: { storeId, productId, status: "approved" },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const count = grouped._count._all;
  return {
    count,
    averageRating: count > 0 && grouped._avg.rating != null
      ? Number(grouped._avg.rating.toFixed(2))
      : null,
  };
}

/**
 * Admin listing with optional status filter and product enrichment.
 */
export async function listReviewsForAdmin(
  storeId: string,
  statusFilter?: ReviewStatus,
  limit = 100,
): Promise<AdminReview[]> {
  const rows = await prisma.productReview.findMany({
    where: {
      storeId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    include: {
      product: {
        select: { id: true, title: true, handle: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verifiedPurchase: r.verifiedPurchase,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    status: r.status as ReviewStatus,
    productId: r.productId,
    productTitle: r.product.title,
    productHandle: r.product.handle,
    moderatedAt: r.moderatedAt,
    source: r.source,
  }));
}

/**
 * Counter set used by the admin page header.
 */
export async function getAdminReviewCounts(storeId: string) {
  const grouped = await prisma.productReview.groupBy({
    by: ["status"],
    where: { storeId },
    _count: { _all: true },
  });
  const out = { pending: 0, approved: 0, hidden: 0, total: 0 };
  for (const row of grouped) {
    const s = row.status as ReviewStatus;
    if (s in out) {
      (out as Record<string, number>)[s] = row._count._all;
    }
    out.total += row._count._all;
  }
  return out;
}
