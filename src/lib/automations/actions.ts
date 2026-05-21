"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/guard";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Automation Configuration Actions ─────────────────────────────────
// Real toggle and config persistence for automations. All mutations are
// gated by the RBAC permission `automation.toggle` / `automation.config`
// and emit an audit-trail SystemEvent with actorId + actorRole.

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
  const actor = await requirePermission("automation.toggle");

  await prisma.automationConfig.upsert({
    where: { storeId_automKey: { storeId: actor.storeId, automKey } },
    create: { storeId: actor.storeId, automKey, enabled },
    update: { enabled },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "automation",
    entityId: automKey,
    eventType: enabled ? "automation_enabled" : "automation_disabled",
    severity: "info",
    source: "admin_panel",
    message: `Automation '${automKey}' ${enabled ? "enabled" : "disabled"} by ${actor.role}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { automKey, enabled },
  });

  revalidatePath("/admin/automations");
  return { success: true };
}

export async function updateAutomationConfig(
  automKey: string,
  configJson: Record<string, unknown>,
) {
  assertValidKey(automKey);
  const actor = await requirePermission("automation.config");

  const serialized = JSON.stringify(configJson ?? {});
  if (serialized.length > MAX_CONFIG_SIZE_BYTES) {
    throw new Error(`Automation config too large (>${MAX_CONFIG_SIZE_BYTES} bytes)`);
  }

  await prisma.automationConfig.upsert({
    where: { storeId_automKey: { storeId: actor.storeId, automKey } },
    create: { storeId: actor.storeId, automKey, configJson: serialized },
    update: { configJson: serialized },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "automation",
    entityId: automKey,
    eventType: "automation_config_updated",
    severity: "info",
    source: "admin_panel",
    message: `Automation '${automKey}' config updated by ${actor.role}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { automKey, configBytes: serialized.length },
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
