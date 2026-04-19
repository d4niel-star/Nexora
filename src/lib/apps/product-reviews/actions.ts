"use server";

// ─── Product Reviews · Server actions ───
// Public: submitReviewAction (from PDP form). Admin: approve/hide/unhide/
// delete. Hard guards:
//   - App must be installed + active for the store.
//   - Plan must include productReviews.
//   - Submissions land as "pending"; never auto-approved.
//   - rating ∈ [1..5], body length 10..2000, displayName 2..60 chars.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, type PlanConfig } from "@/lib/billing/plans";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; error: string };

const RATE_LIMIT_WINDOW_MIN = 30;
const RATE_LIMIT_MAX_PER_PRODUCT = 1;

async function loadAdminGate() {
  const [store, user] = await Promise.all([getCurrentStore(), getCurrentUser()]);
  if (!store) return { store: null, user, planConfig: null } as const;

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
    include: { plan: true },
  });
  const planConfig: PlanConfig | null =
    (sub?.plan && PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config) ??
    null;

  return { store, user, planConfig } as const;
}

function invalidatePaths(storeSlug: string | null, productHandle?: string | null) {
  revalidatePath("/admin/apps");
  revalidatePath("/admin/apps/product-reviews");
  revalidatePath("/admin/apps/product-reviews/moderation");
  if (storeSlug && productHandle) {
    revalidatePath(`/store/${storeSlug}/products/${productHandle}`);
  }
}

// ─── Public submit ─────────────────────────────────────────────────────────

export interface SubmitReviewInput {
  storeSlug: string;
  productId: string;
  displayName: string;
  rating: number;
  title?: string;
  body: string;
}

export async function submitReviewAction(
  input: SubmitReviewInput,
): Promise<ReviewActionResult> {
  const displayName = input.displayName?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const title = input.title?.trim();
  const rating = Math.trunc(Number(input.rating));

  if (displayName.length < 2 || displayName.length > 60) {
    return { ok: false, error: "invalid_name" };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "invalid_rating" };
  }
  if (body.length < 10 || body.length > 2000) {
    return { ok: false, error: "invalid_body" };
  }
  if (title && title.length > 120) {
    return { ok: false, error: "invalid_title" };
  }

  // Store is resolved from the storefront slug, NOT from an admin session.
  const store = await prisma.store.findUnique({
    where: { slug: input.storeSlug },
    select: { id: true, slug: true },
  });
  if (!store) return { ok: false, error: "store_not_found" };

  // App must be installed + active; otherwise pretend nothing happened.
  const install = await prisma.installedApp.findUnique({
    where: {
      storeId_appSlug: { storeId: store.id, appSlug: "product-reviews" },
    },
  });
  if (!install || install.status !== "active") {
    return { ok: false, error: "app_not_active" };
  }

  const product = await prisma.product.findFirst({
    where: { storeId: store.id, id: input.productId },
    select: { id: true, handle: true },
  });
  if (!product) return { ok: false, error: "product_not_found" };

  // Rate-limit: 1 submission per product per IP per 30 min.
  const h = await headers();
  const submittedIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  if (submittedIp) {
    const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000);
    const recent = await prisma.productReview.count({
      where: {
        productId: product.id,
        submittedIp,
        createdAt: { gt: cutoff },
      },
    });
    if (recent >= RATE_LIMIT_MAX_PER_PRODUCT) {
      return { ok: false, error: "rate_limited" };
    }
  }

  await prisma.productReview.create({
    data: {
      storeId: store.id,
      productId: product.id,
      displayName,
      rating,
      title: title || null,
      body,
      status: "pending",
      source: "storefront",
      submittedIp: submittedIp || undefined,
    },
  });

  invalidatePaths(store.slug, product.handle);
  return { ok: true };
}

// ─── Admin moderation ──────────────────────────────────────────────────────

async function moderate(
  reviewId: string,
  nextStatus: "approved" | "hidden" | "pending",
): Promise<ReviewActionResult> {
  const { store, user, planConfig } = await loadAdminGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.productReviews) return { ok: false, error: "plan_locked" };

  const row = await prisma.productReview.findUnique({
    where: { id: reviewId },
    select: {
      storeId: true,
      product: { select: { handle: true } },
    },
  });
  if (!row || row.storeId !== store.id) {
    return { ok: false, error: "review_not_found" };
  }

  await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      status: nextStatus,
      moderatedBy: user?.id ?? null,
      moderatedAt: new Date(),
      publishedAt: nextStatus === "approved" ? new Date() : null,
    },
  });

  invalidatePaths(store.slug, row.product.handle);
  return { ok: true };
}

export async function approveReviewAction(reviewId: string) {
  return moderate(reviewId, "approved");
}
export async function hideReviewAction(reviewId: string) {
  return moderate(reviewId, "hidden");
}
export async function unhideReviewAction(reviewId: string) {
  // Unhide resets to pending so the admin re-reviews explicitly before
  // publishing — never auto-approve on unhide.
  return moderate(reviewId, "pending");
}

export async function deleteReviewAction(
  reviewId: string,
): Promise<ReviewActionResult> {
  const { store, planConfig } = await loadAdminGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.productReviews) return { ok: false, error: "plan_locked" };

  const row = await prisma.productReview.findUnique({
    where: { id: reviewId },
    select: {
      storeId: true,
      product: { select: { handle: true } },
    },
  });
  if (!row || row.storeId !== store.id) {
    return { ok: false, error: "review_not_found" };
  }

  await prisma.productReview.delete({ where: { id: reviewId } });
  invalidatePaths(store.slug, row.product.handle);
  return { ok: true };
}
