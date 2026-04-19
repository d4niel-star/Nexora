// ─── Nexora Apps V1 · Queries ───
// Pure read-only helpers for /admin/apps. The registry is the source of
// truth for definitions; this layer enriches each entry with tenant state
// and plan gating.

import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS, type PlanConfig } from "@/lib/billing/plans";
import {
  APP_REGISTRY,
  getAppBySlug,
  listVisibleApps,
  resolveAvailability,
  type AppDefinition,
  type AppAvailability,
} from "./registry";

export type InstalledAppStatus = "active" | "needs_setup" | "disabled";

export interface AppInstallState {
  installed: boolean;
  status: InstalledAppStatus | null;
  installedAt: Date | null;
}

/**
 * Serializable projection of `AppDefinition` for Client Components. Strips
 * the `planGate` predicate (non-serializable function). Availability is
 * already resolved server-side into `AppAvailability`.
 */
export type AppDefinitionView = Omit<AppDefinition, "planGate">;

export interface AppCatalogItem {
  definition: AppDefinitionView;
  availability: AppAvailability;
  state: AppInstallState;
}

function toView(def: AppDefinition): AppDefinitionView {
  // Explicit destructure keeps this resilient to future additions.
  const { planGate: _planGate, ...rest } = def;
  void _planGate;
  return rest;
}

async function getPlanConfig(storeId: string): Promise<PlanConfig | null> {
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!sub?.plan) return null;
  const def = PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code);
  return def?.config ?? null;
}

async function getInstallStates(
  storeId: string,
): Promise<Record<string, AppInstallState>> {
  const rows = await prisma.installedApp.findMany({
    where: { storeId },
    select: { appSlug: true, status: true, installedAt: true },
  });
  const out: Record<string, AppInstallState> = {};
  for (const row of rows) {
    out[row.appSlug] = {
      installed: true,
      status: row.status as InstalledAppStatus,
      installedAt: row.installedAt,
    };
  }
  return out;
}

/**
 * Full catalogue merged with tenant state. Safe to call for the /admin/apps
 * index page. Returns the full list of visible apps (including coming-soon).
 */
export async function getAppCatalog(storeId: string): Promise<AppCatalogItem[]> {
  const [planConfig, states] = await Promise.all([
    getPlanConfig(storeId),
    getInstallStates(storeId),
  ]);

  return listVisibleApps().map((definition) => ({
    definition: toView(definition),
    availability: resolveAvailability(definition, planConfig),
    state:
      states[definition.slug] ?? {
        installed: false,
        status: null,
        installedAt: null,
      },
  }));
}

/** Detail view — returns null when the slug doesn't map to a definition. */
export async function getAppDetail(
  storeId: string,
  slug: string,
): Promise<AppCatalogItem | null> {
  const definition = getAppBySlug(slug);
  if (!definition || definition.isHidden) return null;

  const [planConfig, states] = await Promise.all([
    getPlanConfig(storeId),
    getInstallStates(storeId),
  ]);

  return {
    definition: toView(definition),
    availability: resolveAvailability(definition, planConfig),
    state:
      states[slug] ?? {
        installed: false,
        status: null,
        installedAt: null,
      },
  };
}

/** Used by the catalogue header for the "Instaladas / Disponibles" chips.
 *  `installed` counts every row in InstalledApp regardless of status so it
 *  stays consistent with the per-card badge ("Instalada" / "Desactivada")
 *  and with the client-side "Instaladas" filter. */
export async function getCatalogSummary(storeId: string) {
  const states = await getInstallStates(storeId);
  const installed = Object.values(states).filter((s) => s.installed).length;
  const total = listVisibleApps().filter((a) => !a.isComingSoon).length;
  return { installed, total, comingSoon: APP_REGISTRY.filter((a) => a.isComingSoon).length };
}
