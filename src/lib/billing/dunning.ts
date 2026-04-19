"use server";

import { prisma } from "@/lib/db/prisma";
import { getEmailProvider } from "@/lib/email/providers";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Dunning email types ───
// These are billing-level emails sent to the store OWNER, not to a customer.
// They reuse the existing email infrastructure but bypass the order-centric
// sendEmailEvent flow because they have a different data shape.

type DunningEventType =
  | "BILLING_PAYMENT_FAILED"
  | "BILLING_SUSPENSION_WARNING"
  | "BILLING_REACTIVATED";

interface DunningEmailData {
  storeName: string;
  ownerName: string;
  planName: string;
  planPrice: number;
  billingUrl: string;
}

// ─── Templates ───

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);

function dunningBaseTemplate(
  title: string,
  content: string,
  ctaUrl?: string,
  ctaText?: string,
) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FAFB; color: #111111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px; background-color: #111111;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Nexora</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
              ${
                ctaUrl && ctaText
                  ? `
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111111; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 4px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px 40px; background-color: #F3F4F6; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 13px;">
              <p style="margin: 0 0 10px 0;">Este es un mensaje automático de <strong>Nexora</strong> sobre tu suscripción.</p>
              <p style="margin: 0;">¿Necesitás ayuda? Respondé este correo o escribinos a soporte@nexora.io.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generatePaymentFailedTemplate(data: DunningEmailData): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #B91C1C;">Hubo un problema con tu cobro</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.ownerName || ""},<br>
      No pudimos procesar el cobro de tu suscripción <strong>${data.planName}</strong> (${formatCurrency(data.planPrice)}/mes) para la tienda <strong>${data.storeName}</strong>.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Tu tienda sigue online por ahora, pero las funcionalidades premium de tu plan se encuentran restringidas hasta que se regularice el pago.
    </p>
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #991B1B; font-weight: 600;">
        ⚠ Si el cobro no se resuelve, tu cuenta podría ser suspendida.
      </p>
    </div>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Entrá a tu panel de facturación para actualizar tu método de pago o resolver el cobro pendiente.
    </p>
  `;
  return dunningBaseTemplate(
    "Problema con tu cobro — Nexora",
    content,
    data.billingUrl,
    "Resolver pago ahora",
  );
}

function generateSuspensionWarningTemplate(data: DunningEmailData): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #B91C1C;">Tu cuenta está en riesgo de suspensión</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.ownerName || ""},<br>
      Tu suscripción <strong>${data.planName}</strong> para <strong>${data.storeName}</strong> tiene un cobro pendiente que no pudimos resolver.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Todas las funcionalidades premium de tu plan están bloqueadas. Tu storefront sigue visible, pero no podés operar las herramientas avanzadas que tu plan incluye.
    </p>
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #991B1B; font-weight: 600;">
        Si no se resuelve el pago, la cuenta será cancelada y perderás acceso a todas las funcionalidades del plan ${data.planName}.
      </p>
    </div>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      No queremos que pierdas tu trabajo. Regularizá tu suscripción ahora.
    </p>
  `;
  return dunningBaseTemplate(
    "Riesgo de suspensión — Nexora",
    content,
    data.billingUrl,
    "Regularizar ahora",
  );
}

function generateReactivatedTemplate(data: DunningEmailData): string {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #059669;">¡Tu suscripción fue reactivada!</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.ownerName || ""},<br>
      Te confirmamos que el pago de tu plan <strong>${data.planName}</strong> (${formatCurrency(data.planPrice)}/mes) fue procesado correctamente.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Todas las funcionalidades de tu plan volvieron a estar habilitadas. Tu tienda <strong>${data.storeName}</strong> está operando al 100%.
    </p>
    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #065F46; font-weight: 600;">
        ✓ Suscripción activa · Plan ${data.planName} · ${formatCurrency(data.planPrice)}/mes
      </p>
    </div>
  `;
  return dunningBaseTemplate(
    "Suscripción reactivada — Nexora",
    content,
    data.billingUrl,
    "Ir a mi panel",
  );
}

// ─── Send dunning email (idempotent via EmailLog) ───

export async function sendDunningEmail(
  storeId: string,
  eventType: DunningEventType,
  data: DunningEmailData,
  recipientEmail: string,
): Promise<boolean> {
  // Idempotency: one email per event type per store per billing cycle.
  // entityId = storeId so each store gets exactly one of each dunning type.
  const existingLog = await prisma.emailLog.findUnique({
    where: {
      eventType_entityType_entityId: {
        eventType,
        entityType: "billing",
        entityId: storeId,
      },
    },
  });

  if (existingLog?.status === "sent") {
    return true; // Already sent this cycle
  }

  const provider = getEmailProvider();

  const log = await prisma.emailLog.upsert({
    where: {
      eventType_entityType_entityId: {
        eventType,
        entityType: "billing",
        entityId: storeId,
      },
    },
    update: { status: "pending", errorMessage: null },
    create: {
      storeId,
      eventType,
      entityType: "billing",
      entityId: storeId,
      recipient: recipientEmail,
      status: "pending",
      provider: provider.name,
    },
  });

  try {
    let subject = "";
    let html = "";

    switch (eventType) {
      case "BILLING_PAYMENT_FAILED":
        subject = `Problema con tu cobro — ${data.storeName}`;
        html = generatePaymentFailedTemplate(data);
        break;
      case "BILLING_SUSPENSION_WARNING":
        subject = `Tu cuenta está en riesgo — ${data.storeName}`;
        html = generateSuspensionWarningTemplate(data);
        break;
      case "BILLING_REACTIVATED":
        subject = `¡Suscripción reactivada! — ${data.storeName}`;
        html = generateReactivatedTemplate(data);
        break;
    }

    const result = await provider.send({ to: recipientEmail, subject, html });

    if (result.success) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "sent", sentAt: new Date(), errorMessage: null },
      });
      return true;
    }

    throw new Error(result.error || "Provider error");
  } catch (error: any) {
    await logSystemEvent({
      storeId,
      entityType: "billing",
      entityId: storeId,
      eventType: "dunning_email_failed",
      severity: "error",
      source: "dunning",
      message: `Error enviando email de dunning ${eventType}`,
      metadata: { error: error.message },
    });

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage: String(error.message || error) },
    });
    return false;
  }
}

// ─── Clear dunning emails (on reactivation, allow future dunning cycle) ───

export async function clearDunningEmails(storeId: string) {
  // Delete dunning + reactivation email logs so a future payment failure
  // can re-trigger fresh notifications, and so a later reactivation email
  // is actually sent again. Without clearing BILLING_REACTIVATED here,
  // the second past_due → active cycle for the same store would hit the
  // idempotency guard inside sendDunningEmail and silently skip.
  await prisma.emailLog.deleteMany({
    where: {
      storeId,
      entityType: "billing",
      eventType: {
        in: [
          "BILLING_PAYMENT_FAILED",
          "BILLING_SUSPENSION_WARNING",
          "BILLING_REACTIVATED",
        ],
      },
    },
  });
}

// ─── Get subscription status info for UI ───

export interface DunningState {
  status: "ok" | "warning" | "critical" | "dead";
  label: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

export async function getDunningState(storeId: string): Promise<DunningState | null> {
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });

  if (!sub) return null;

  switch (sub.status) {
    case "active":
    case "trialing":
      return null; // No dunning needed

    case "trial_expired":
      return {
        status: "critical",
        label: "Trial expirado",
        message: "Tu período de prueba de 14 días terminó. Activá un plan para seguir operando tu tienda.",
        ctaLabel: "Elegir un plan",
        ctaHref: "/admin/billing",
      };

    case "past_due":
      return {
        status: "warning",
        label: "Pago pendiente",
        message: `No pudimos procesar el cobro de tu plan ${sub.plan.name}. Las funcionalidades premium están restringidas hasta resolver el pago.`,
        ctaLabel: "Resolver pago",
        ctaHref: "/admin/billing",
      };

    case "unpaid":
      return {
        status: "critical",
        label: "Cuenta impaga",
        message: `Tu plan ${sub.plan.name} tiene un cobro pendiente sin resolver. Todas las funcionalidades premium están bloqueadas.`,
        ctaLabel: "Regularizar cuenta",
        ctaHref: "/admin/billing",
      };

    case "cancelled":
      return {
        status: "dead",
        label: "Suscripción cancelada",
        message: "Tu suscripción fue cancelada. Reactivá un plan para volver a operar con todas las funcionalidades.",
        ctaLabel: "Reactivar plan",
        ctaHref: "/admin/billing",
      };

    default:
      return null;
  }
}
