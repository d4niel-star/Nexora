"use server";

// ─── Nexora Apps V1 · Server actions ───
// Install / uninstall / toggle lifecycle for the current tenant. Strict
// guards against coming-soon and plan-locked apps; no third-party code runs.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, type PlanConfig } from "@/lib/billing/plans";

import { getAppBySlug, resolveAvailability } from "./registry";

export type AppActionResult =
  | { ok: true; status: "active" | "needs_setup" | "disabled" }
  | { ok: false; error: string };

async function loadContext() {
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

function invalidateCatalog(slug: string) {
  revalidatePath("/admin/apps");
  revalidatePath(`/admin/apps/${slug}`);
}

/**
 * Install the app for the current tenant. Honours coming-soon and plan-lock
 * guards. Idempotent — a subsequent install on an existing record flips
 * status back to "active" without duplicating rows.
 */
export async function installAppAction(slug: string): Promise<AppActionResult> {
  const definition = getAppBySlug(slug);
  if (!definition) return { ok: false, error: "app_not_found" };

  const { store, user, planConfig } = await loadContext();
  if (!store) return { ok: false, error: "no_active_store" };

  const availability = resolveAvailability(definition, planConfig);
  if (availability.kind === "coming-soon") {
    return { ok: false, error: "coming_soon" };
  }
  if (availability.kind === "plan-locked") {
    return { ok: false, error: "plan_locked" };
  }

  // deep-link apps go straight to `active`; builtin apps also activate on
  // install in V1 — no separate configuration step required for the ones
  // shipped here.
  const status: "active" = "active";

  await prisma.installedApp.upsert({
    where: {
      storeId_appSlug: { storeId: store.id, appSlug: slug },
    },
    create: {
      storeId: store.id,
      appSlug: slug,
      status,
      installedBy: user?.id ?? null,
    },
    update: {
      status,
      installedBy: user?.id ?? null,
    },
  });

  invalidateCatalog(slug);
  return { ok: true, status };
}

export async function uninstallAppAction(slug: string): Promise<AppActionResult> {
  const definition = getAppBySlug(slug);
  if (!definition) return { ok: false, error: "app_not_found" };

  const { store } = await loadContext();
  if (!store) return { ok: false, error: "no_active_store" };

  await prisma.installedApp.deleteMany({
    where: { storeId: store.id, appSlug: slug },
  });

  invalidateCatalog(slug);
  return { ok: true, status: "disabled" };
}

/**
 * Flip between `active` and `disabled` without losing the installation
 * history. Used for soft-enable/disable without a full uninstall.
 */
export async function toggleAppAction(slug: string): Promise<AppActionResult> {
  const definition = getAppBySlug(slug);
  if (!definition) return { ok: false, error: "app_not_found" };

  const { store, planConfig } = await loadContext();
  if (!store) return { ok: false, error: "no_active_store" };

  const availability = resolveAvailability(definition, planConfig);
  if (availability.kind === "coming-soon") {
    return { ok: false, error: "coming_soon" };
  }
  if (availability.kind === "plan-locked") {
    return { ok: false, error: "plan_locked" };
  }

  const existing = await prisma.installedApp.findUnique({
    where: { storeId_appSlug: { storeId: store.id, appSlug: slug } },
  });

  const nextStatus =
    existing?.status === "active" ? "disabled" : ("active" as const);

  await prisma.installedApp.upsert({
    where: {
      storeId_appSlug: { storeId: store.id, appSlug: slug },
    },
    create: {
      storeId: store.id,
      appSlug: slug,
      status: nextStatus,
    },
    update: {
      status: nextStatus,
    },
  });

  invalidateCatalog(slug);
  return { ok: true, status: nextStatus };
}
