"use server";

// ─── Post-purchase flows · Server actions ───
// Minimal write layer: save settings, sync InstalledApp status.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, type PlanConfig } from "@/lib/billing/plans";

export type PostPurchaseActionResult =
  | { ok: true }
  | { ok: false; error: string };

interface SettingsInput {
  reviewRequestEnabled: boolean;
  reviewRequestDelayDays: number;
  reorderFollowupEnabled: boolean;
  reorderFollowupDelayDays: number;
}

const MIN_DELAY = 1;
const MAX_DELAY = 60;
// Reorder follow-up intentionally uses a wider window: sending at day 30
// or later is healthier for recompra and less spam-prone than the review
// flow. Hard minimum is 7 to avoid "next-day resell" anti-patterns.
const REORDER_MIN_DELAY = 7;
const REORDER_MAX_DELAY = 180;

async function loadGate() {
  const store = await getCurrentStore();
  if (!store) return { store: null, planConfig: null } as const;
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
    include: { plan: true },
  });
  const planConfig: PlanConfig | null =
    sub?.status === "active" || sub?.status === "trialing"
      ? (sub.plan && PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config) ?? null
      : null;
  return { store, planConfig } as const;
}

export async function savePostPurchaseSettingsAction(
  input: SettingsInput,
): Promise<PostPurchaseActionResult> {
  const { store, planConfig } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.postPurchaseFlows) return { ok: false, error: "plan_locked" };

  const delayRaw = Math.trunc(Number(input.reviewRequestDelayDays));
  if (!Number.isFinite(delayRaw) || delayRaw < MIN_DELAY || delayRaw > MAX_DELAY) {
    return { ok: false, error: "invalid_delay" };
  }
  const reorderDelayRaw = Math.trunc(Number(input.reorderFollowupDelayDays));
  if (
    !Number.isFinite(reorderDelayRaw) ||
    reorderDelayRaw < REORDER_MIN_DELAY ||
    reorderDelayRaw > REORDER_MAX_DELAY
  ) {
    return { ok: false, error: "invalid_reorder_delay" };
  }
  const enabled = Boolean(input.reviewRequestEnabled);
  const reorderEnabled = Boolean(input.reorderFollowupEnabled);

  await prisma.postPurchaseFlowsSettings.upsert({
    where: { storeId: store.id },
    create: {
      storeId: store.id,
      reviewRequestEnabled: enabled,
      reviewRequestDelayDays: delayRaw,
      reorderFollowupEnabled: reorderEnabled,
      reorderFollowupDelayDays: reorderDelayRaw,
    },
    update: {
      reviewRequestEnabled: enabled,
      reviewRequestDelayDays: delayRaw,
      reorderFollowupEnabled: reorderEnabled,
      reorderFollowupDelayDays: reorderDelayRaw,
    },
  });

  // Mirror InstalledApp.status so the catalog badge is honest: the app is
  // "active" when ANY flow is enabled, "needs_setup" when every flow is
  // off. Upsert (not updateMany) so that saving settings from /setup also
  // materialises the install row when the merchant landed there directly
  // via URL without going through the catalog.
  const anyFlowEnabled = enabled || reorderEnabled;
  const nextAppStatus = anyFlowEnabled ? "active" : "needs_setup";
  await prisma.installedApp.upsert({
    where: {
      storeId_appSlug: {
        storeId: store.id,
        appSlug: "post-purchase-flows",
      },
    },
    create: {
      storeId: store.id,
      appSlug: "post-purchase-flows",
      status: nextAppStatus,
    },
    update: { status: nextAppStatus },
  });

  revalidatePath("/admin/apps");
  revalidatePath("/admin/apps/post-purchase-flows");
  revalidatePath("/admin/apps/post-purchase-flows/setup");
  return { ok: true };
}
