"use server";

// ─── WhatsApp Recovery · Server actions ───
// Persistence layer for tenant-scoped WhatsApp recovery settings. All writes
// are gated by plan (whatsappRecovery flag) and the current admin session.
// Access tokens are encrypted before persistence.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, type PlanConfig } from "@/lib/billing/plans";
import { encryptToken } from "@/lib/security/token-crypto";

export type WhatsappSettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

interface SettingsInput {
  phoneNumberId?: string;
  accessToken?: string;
  templateName?: string;
  templateLanguage?: string;
}

async function loadGate() {
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

function sanitizeString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Save per-tenant WhatsApp recovery settings and flip the InstalledApp
 * status to "active" once the minimum viable config is present. Does NOT
 * touch the access token unless a fresh value is provided.
 */
export async function saveWhatsappSettingsAction(
  input: SettingsInput,
): Promise<WhatsappSettingsActionResult> {
  const { store, planConfig } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.whatsappRecovery) {
    return { ok: false, error: "plan_locked" };
  }

  const phoneNumberId = sanitizeString(input.phoneNumberId);
  const accessToken = sanitizeString(input.accessToken);
  const templateName = sanitizeString(input.templateName);
  const templateLanguage = sanitizeString(input.templateLanguage) ?? "es_AR";

  // Partial updates are allowed: token is only overwritten if provided.
  const encryptedToken = accessToken ? encryptToken(accessToken) : undefined;

  const existing = await prisma.whatsappRecoverySettings.findUnique({
    where: { storeId: store.id },
  });

  const merged = {
    phoneNumberId: phoneNumberId ?? existing?.phoneNumberId ?? null,
    accessTokenEncrypted:
      encryptedToken ?? existing?.accessTokenEncrypted ?? null,
    templateName: templateName ?? existing?.templateName ?? null,
    templateLanguage,
  };

  const complete =
    Boolean(merged.phoneNumberId) &&
    Boolean(merged.accessTokenEncrypted) &&
    Boolean(merged.templateName);

  const nextStatus = complete ? "active" : "needs_setup";

  await prisma.whatsappRecoverySettings.upsert({
    where: { storeId: store.id },
    create: {
      storeId: store.id,
      ...merged,
      status: nextStatus,
    },
    update: {
      ...merged,
      status: nextStatus,
      lastValidatedAt: complete ? new Date() : null,
    },
  });

  // Align the InstalledApp row with the new settings completeness so the
  // catalog badge reflects reality immediately.
  await prisma.installedApp.upsert({
    where: {
      storeId_appSlug: {
        storeId: store.id,
        appSlug: "whatsapp-recovery",
      },
    },
    create: {
      storeId: store.id,
      appSlug: "whatsapp-recovery",
      status: nextStatus,
    },
    update: { status: nextStatus },
  });

  revalidatePath("/admin/apps");
  revalidatePath("/admin/apps/whatsapp-recovery");
  revalidatePath("/admin/apps/whatsapp-recovery/setup");
  return { ok: true };
}

/**
 * Clear stored credentials while keeping the install record. Drops the
 * InstalledApp back to "needs_setup".
 */
export async function disconnectWhatsappAction(): Promise<WhatsappSettingsActionResult> {
  const { store } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };

  await prisma.whatsappRecoverySettings.upsert({
    where: { storeId: store.id },
    create: {
      storeId: store.id,
      status: "needs_setup",
    },
    update: {
      phoneNumberId: null,
      accessTokenEncrypted: null,
      templateName: null,
      status: "needs_setup",
      lastValidatedAt: null,
    },
  });

  await prisma.installedApp.updateMany({
    where: { storeId: store.id, appSlug: "whatsapp-recovery" },
    data: { status: "needs_setup" },
  });

  revalidatePath("/admin/apps");
  revalidatePath("/admin/apps/whatsapp-recovery");
  revalidatePath("/admin/apps/whatsapp-recovery/setup");
  return { ok: true };
}
