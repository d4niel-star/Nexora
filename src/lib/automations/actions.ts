"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

// ─── Automation Configuration Actions ─────────────────────────────────
// Real toggle and config persistence for automations.

// Allow-list of valid automation keys. Prevents arbitrary writes to the
// AutomationConfig table from a compromised admin form.
const VALID_AUTOM_KEYS = new Set([
  "abandoned_carts",
  "dunning",
  "pickup_expiration",
  "review_requests",
  "stock_alerts",
]);

const MAX_CONFIG_SIZE_BYTES = 4096;

function assertValidKey(key: string): void {
  if (!VALID_AUTOM_KEYS.has(key)) {
    throw new Error(`Invalid automation key: ${key}`);
  }
}

export async function toggleAutomation(automKey: string, enabled: boolean) {
  assertValidKey(automKey);
  const store = await getCurrentStore();
  if (!store) throw new Error("No store");

  await prisma.automationConfig.upsert({
    where: { storeId_automKey: { storeId: store.id, automKey } },
    create: { storeId: store.id, automKey, enabled },
    update: { enabled },
  });

  revalidatePath("/admin/automations");
  return { success: true };
}

export async function updateAutomationConfig(
  automKey: string,
  configJson: Record<string, unknown>,
) {
  assertValidKey(automKey);
  const store = await getCurrentStore();
  if (!store) throw new Error("No store");

  const serialized = JSON.stringify(configJson ?? {});
  if (serialized.length > MAX_CONFIG_SIZE_BYTES) {
    throw new Error(`Automation config too large (>${MAX_CONFIG_SIZE_BYTES} bytes)`);
  }

  await prisma.automationConfig.upsert({
    where: { storeId_automKey: { storeId: store.id, automKey } },
    create: { storeId: store.id, automKey, configJson: serialized },
    update: { configJson: serialized },
  });

  revalidatePath("/admin/automations");
  return { success: true };
}

export async function getAutomationConfigs(storeId: string) {
  const configs = await prisma.automationConfig.findMany({
    where: { storeId },
  });
  type ConfigMap = Record<string, { enabled: boolean; config: Record<string, unknown> }>;
  const result: ConfigMap = {};
  for (const c of configs) {
    result[c.automKey] = {
      enabled: c.enabled,
      config: JSON.parse(c.configJson) as Record<string, unknown>,
    };
  }
  return result;
}
