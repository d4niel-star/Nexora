// ─── Post-purchase flows · Settings ───
// Per-tenant config for the only V2.5 flow: the review-request email.
// All helpers are read-only; writes live in ./actions.ts.

import { prisma } from "@/lib/db/prisma";

export interface PostPurchaseSettingsView {
  reviewRequestEnabled: boolean;
  reviewRequestDelayDays: number;
}

export async function getPostPurchaseSettings(
  storeId: string,
): Promise<PostPurchaseSettingsView> {
  const row = await prisma.postPurchaseFlowsSettings.findUnique({
    where: { storeId },
  });
  if (!row) {
    return { reviewRequestEnabled: false, reviewRequestDelayDays: 7 };
  }
  return {
    reviewRequestEnabled: row.reviewRequestEnabled,
    reviewRequestDelayDays: row.reviewRequestDelayDays,
  };
}

/** True iff the app is installed+active AND the review-request flow is on. */
export async function isReviewRequestFlowActive(
  storeId: string,
): Promise<{ active: boolean; delayDays: number }> {
  try {
    const [install, settings] = await Promise.all([
      prisma.installedApp.findUnique({
        where: {
          storeId_appSlug: { storeId, appSlug: "post-purchase-flows" },
        },
        select: { status: true },
      }),
      prisma.postPurchaseFlowsSettings.findUnique({
        where: { storeId },
      }),
    ]);
    const active =
      install?.status === "active" &&
      Boolean(settings?.reviewRequestEnabled);
    return {
      active,
      delayDays: settings?.reviewRequestDelayDays ?? 7,
    };
  } catch {
    return { active: false, delayDays: 7 };
  }
}
