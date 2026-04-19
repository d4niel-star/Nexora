// ─── WhatsApp Recovery · Cron helper ───
// Called from the abandoned-cart cron to send a single WABA template
// message per cart, idempotently, without affecting the existing email
// pipeline. Any failure is logged and swallowed — the email flow remains
// the primary channel.

import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";

import { resolveWhatsappCredentials } from "./settings";
import { normaliseArPhone, sendTemplateMessage } from "./provider";

const EVENT_TYPE = "ABANDONED_CART_WHATSAPP";
const ENTITY_TYPE = "cart";
const PROVIDER_NAME = "meta-cloud";

interface CartContext {
  cartId: string;
  storeId: string;
  storeName: string;
  phone: string | null | undefined;
  customerFirstName?: string | null;
}

/**
 * Returns true when a message was sent (or was already sent by a previous
 * run); false otherwise. Never throws.
 */
export async function maybeSendWhatsappRecovery(
  ctx: CartContext,
): Promise<boolean> {
  try {
    // 0. Is the app installed + active for the tenant?
    const install = await prisma.installedApp.findUnique({
      where: {
        storeId_appSlug: {
          storeId: ctx.storeId,
          appSlug: "whatsapp-recovery",
        },
      },
    });
    if (!install || install.status !== "active") return false;

    // 1. Do we have full credentials? Degrade safely if not.
    const creds = await resolveWhatsappCredentials(ctx.storeId);
    if (!creds) return false;

    // 2. Does the checkout carry a routable phone number?
    const toPhone = normaliseArPhone(ctx.phone ?? null);
    if (!toPhone) return false;

    // 3. Idempotency guard (same pattern as the email cron).
    const existing = await prisma.emailLog.findUnique({
      where: {
        eventType_entityType_entityId: {
          eventType: EVENT_TYPE,
          entityType: ENTITY_TYPE,
          entityId: ctx.cartId,
        },
      },
    });
    if (existing?.status === "sent") return true;

    const log = await prisma.emailLog.upsert({
      where: {
        eventType_entityType_entityId: {
          eventType: EVENT_TYPE,
          entityType: ENTITY_TYPE,
          entityId: ctx.cartId,
        },
      },
      update: { status: "pending", errorMessage: null },
      create: {
        storeId: ctx.storeId,
        eventType: EVENT_TYPE,
        entityType: ENTITY_TYPE,
        entityId: ctx.cartId,
        recipient: toPhone,
        status: "pending",
        provider: PROVIDER_NAME,
      },
    });

    // 4. Template body params. WABA templates for recovery usually take
    //    {{1}}=customer name (or "cliente") and {{2}}=store name.
    const first = (ctx.customerFirstName ?? "").trim() || "cliente";
    const result = await sendTemplateMessage({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      templateName: creds.templateName,
      templateLanguage: creds.templateLanguage,
      toPhone,
      bodyParams: [first, ctx.storeName],
    });

    if (!result.success) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          errorMessage: result.error.slice(0, 500),
        },
      });
      await logSystemEvent({
        storeId: ctx.storeId,
        entityType: "cart",
        entityId: ctx.cartId,
        eventType: "abandoned_cart_whatsapp_failed",
        severity: "warn",
        source: "cron_abandoned_carts",
        message: `WhatsApp recovery failed for cart ${ctx.cartId}`,
        metadata: { error: result.error },
      });
      return false;
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        errorMessage: null,
      },
    });
    return true;
  } catch (err) {
    // Absolute safety net: WhatsApp must never break the email cron.
    const message = err instanceof Error ? err.message : "unknown";
    await logSystemEvent({
      storeId: ctx.storeId,
      entityType: "cart",
      entityId: ctx.cartId,
      eventType: "abandoned_cart_whatsapp_crash",
      severity: "error",
      source: "cron_abandoned_carts",
      message: `WhatsApp recovery crashed for cart ${ctx.cartId}`,
      metadata: { error: message },
    }).catch(() => {
      /* swallow — audit must never break cron */
    });
    return false;
  }
}
