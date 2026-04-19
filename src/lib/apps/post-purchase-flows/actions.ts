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
}

const MIN_DELAY = 1;
const MAX_DELAY = 60;

async function loadGate() {
  const store = await getCurrentStore();
  if (!store) return { store: null, planConfig: null } as const;
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
    include: { plan: true },
  });
  const planConfig: PlanConfig | null =
    (sub?.plan && PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config) ??
    null;
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
  const enabled = Boolean(input.reviewRequestEnabled);

  await prisma.postPurchaseFlowsSettings.upsert({
    where: { storeId: store.id },
    create: {
      storeId: store.id,
      reviewRequestEnabled: enabled,
      reviewRequestDelayDays: delayRaw,
    },
    update: {
      reviewRequestEnabled: enabled,
      reviewRequestDelayDays: delayRaw,
    },
  });

  // Mirror InstalledApp.status so the catalog badge is honest: if no flow
  // is enabled, the app reports as needs_setup even when installed.
  await prisma.installedApp.updateMany({
    where: { storeId: store.id, appSlug: "post-purchase-flows" },
    data: { status: enabled ? "active" : "needs_setup" },
  });

  revalidatePath("/admin/apps");
  revalidatePath("/admin/apps/post-purchase-flows");
  revalidatePath("/admin/apps/post-purchase-flows/setup");
  return { ok: true };
}
