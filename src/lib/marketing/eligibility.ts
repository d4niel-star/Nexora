// ─── Marketing Eligibility (Phase 7D.5) ──────────────────────────────
// What does Nexora ACTUALLY support today for marketing sends?
// This module answers honestly. Each predicate flips a real card on
// the readiness panel. Nothing is a placeholder.
//
// The product rule: we never claim "ready to send" if any of these
// fail. The marketing page surfaces the gaps explicitly.

import { prisma } from "@/lib/db/prisma";

export interface MarketingReadiness {
  canSend: boolean;
  /** A list of human-readable rows used by the UI. */
  checks: Array<{
    id: string;
    label: string;
    status: "ok" | "missing" | "unknown";
    detail: string;
  }>;
  /** Top-level disabled-state explanation. */
  disabledReason: string | null;
}

export async function getMarketingReadiness(storeId: string): Promise<MarketingReadiness> {
  // ─── Email provider connected? ───
  // Nexora supports Resend (via RESEND_API_KEY env). The merchant
  // configures their public-facing contactEmail in CommunicationSettings
  // — for marketing purposes that's the from-address proxy until a
  // dedicated `marketingFromAddress` field exists.
  const settings = await prisma.storeCommunicationSettings.findUnique({
    where: { storeId },
    select: { contactEmail: true },
  });
  const providerOk = Boolean(process.env.RESEND_API_KEY);
  const fromOk = Boolean(settings?.contactEmail);

  // ─── Suppression / unsubscribe list? ───
  // We do not have a SuppressionList model today. EmailLog status==="bounced"
  // is captured but is not consulted before a marketing send.
  const suppressionOk = false;

  // ─── Rate limiting? ───
  // Per-actor rate limits exist, per-recipient send caps for marketing
  // do NOT. A real campaign send needs a separate per-recipient cap to
  // avoid spamming the same inbox.
  const recipientCapOk = false;

  // ─── Queue infrastructure ───
  // Available — we lean on the same Job runner as automations. Verify
  // there's at least one job that ran in the last 24h to prove the
  // worker is active. If no jobs at all, status=unknown.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentJob = await prisma.job.findFirst({
    where: { storeId, createdAt: { gte: dayAgo } },
    select: { id: true, status: true },
  });
  const queueOk = recentJob !== null;

  // ─── Marketing-campaign send infrastructure ───
  // Honest answer: NOT BUILT. There's no Campaign model, no audience
  // freeze, no per-recipient send loop, no attribution capture. The
  // pieces below this readiness check are foundational only.
  const campaignInfraOk = false;

  const checks: MarketingReadiness["checks"] = [
    {
      id: "provider",
      label: "Proveedor de email conectado",
      status: providerOk ? "ok" : "missing",
      detail: providerOk
        ? "Resend API configurada vía RESEND_API_KEY."
        : "Falta RESEND_API_KEY en el entorno. Sin proveedor no podemos enviar mails.",
    },
    {
      id: "from_address",
      label: "Dirección remitente configurada",
      status: fromOk ? "ok" : "missing",
      detail: fromOk
        ? `Envíos saldrán desde ${settings?.contactEmail}.`
        : "Configurá el contactEmail en Comunicación. Producción debería usar un campo dedicado `marketingFromAddress`.",
    },
    {
      id: "suppression",
      label: "Lista de supresión / unsubscribe",
      status: suppressionOk ? "ok" : "missing",
      detail: "No tenemos un modelo SuppressionList. Los bounces se registran en EmailLog pero no bloquean envíos posteriores. Bloquea envíos masivos hasta que el sistema exista.",
    },
    {
      id: "recipient_cap",
      label: "Límite de envíos por destinatario",
      status: recipientCapOk ? "ok" : "missing",
      detail: "No hay rate limit por dirección de email. Sin esto un campaign mal configurado puede spammear el mismo inbox múltiples veces.",
    },
    {
      id: "queue",
      label: "Cola de jobs operativa",
      status: queueOk ? "ok" : "unknown",
      detail: queueOk
        ? "El worker de jobs corrió hace menos de 24h."
        : "No detectamos actividad reciente en el queue. Puede no haber datos aún.",
    },
    {
      id: "campaign_engine",
      label: "Motor de campañas",
      status: campaignInfraOk ? "ok" : "missing",
      detail: "No implementado. Falta: modelo Campaign, freeze de audiencia, send loop por recipiente, captura de attribution. Esto es la próxima fase.",
    },
  ];

  const missing = checks.filter((c) => c.status === "missing").map((c) => c.label);
  const canSend = missing.length === 0;
  const disabledReason = canSend
    ? null
    : `Envío de campañas NO habilitado. Faltan: ${missing.join("; ")}.`;

  return { canSend, checks, disabledReason };
}
