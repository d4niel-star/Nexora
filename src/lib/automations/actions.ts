"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

// ─── Automation Configuration Actions ─────────────────────────────────
// Real toggle and config persistence for automations.

export async function toggleAutomation(automKey: string, enabled: boolean) {
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
  const store = await getCurrentStore();
  if (!store) throw new Error("No store");

  await prisma.automationConfig.upsert({
    where: { storeId_automKey: { storeId: store.id, automKey } },
    create: { storeId: store.id, automKey, configJson: JSON.stringify(configJson) },
    update: { configJson: JSON.stringify(configJson) },
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
