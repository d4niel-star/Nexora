import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

// ─── Automation Center — Server Queries ────────────────────────────────────
// Fetches real metrics from SystemEvent, EmailLog, and related models
// to power the Automation Center dashboard. All queries are scoped to
// the current store.

export interface AutomationCard {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  lastRun: string | null;
  successCount: number;
  failureCount: number;
  totalProcessed: number;
}

export interface AutomationLogEntry {
  id: string;
  timestamp: string;
  automation: string;
  status: "success" | "failure" | "info";
  message: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AutomationDashboardData {
  cards: AutomationCard[];
  recentLogs: AutomationLogEntry[];
  healthWarnings: string[];
}

const AUTOMATION_EVENT_TYPES: Record<string, { label: string; desc: string; eventPatterns: string[] }> = {
  abandoned_carts: {
    label: "Carritos abandonados",
    desc: "Envía emails de recuperación a compradores que abandonaron el checkout.",
    eventPatterns: ["abandoned_cart", "ABANDONED_CART"],
  },
  dunning: {
    label: "Dunning / Cobro",
    desc: "Envía recordatorios de pago a tiendas con suscripción vencida.",
    eventPatterns: ["dunning", "BILLING_PAYMENT_FAILED", "BILLING_SUSPENSION_WARNING"],
  },
  pickup_expiration: {
    label: "Expiración de pickup",
    desc: "Cancela reservas de pickup no pagadas y restaura stock local.",
    eventPatterns: ["pickup_expired", "pickup_reservation"],
  },
  review_requests: {
    label: "Solicitudes de reseña",
    desc: "Envía emails post-compra solicitando reseñas a clientes.",
    eventPatterns: ["POST_PURCHASE_REVIEW", "POST_PURCHASE_REORDER"],
  },
  stock_alerts: {
    label: "Alertas de stock bajo",
    desc: "Notifica al dueño cuando un producto llega al punto de reorden.",
    eventPatterns: ["STOCK_CRITICAL", "stock_critical"],
  },
};

export async function getAutomationDashboard(): Promise<AutomationDashboardData> {
  const store = await getCurrentStore();
  const storeId = store?.id;

  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last9h = new Date(Date.now() - 9 * 60 * 60 * 1000);

  // Fetch all relevant system events for this store in last 30 days
  const [systemEvents, emailLogs] = await Promise.all([
    prisma.systemEvent.findMany({
      where: {
        createdAt: { gte: last30d },
        ...(storeId ? { OR: [{ storeId }, { storeId: "system" }, { storeId: null }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.emailLog.findMany({
      where: {
        createdAt: { gte: last30d },
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const cards: AutomationCard[] = [];
  const healthWarnings: string[] = [];

  for (const [key, def] of Object.entries(AUTOMATION_EVENT_TYPES)) {
    const matchingEvents = systemEvents.filter((e) =>
      def.eventPatterns.some((p) => e.eventType.includes(p) || e.message.includes(p)),
    );
    const matchingEmails = emailLogs.filter((e) =>
      def.eventPatterns.some((p) => e.eventType.includes(p)),
    );

    const allMatches = [
      ...matchingEvents.map((e) => ({ at: e.createdAt, ok: e.severity !== "error" && e.severity !== "critical" })),
      ...matchingEmails.map((e) => ({ at: e.createdAt, ok: e.status === "sent" })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    const successCount = allMatches.filter((m) => m.ok).length;
    const failureCount = allMatches.filter((m) => !m.ok).length;
    const lastRun = allMatches[0]?.at.toISOString() ?? null;

    // Check staleness
    if (lastRun && new Date(lastRun) < last9h && key !== "stock_alerts") {
      healthWarnings.push(`${def.label}: sin actividad en las últimas 9 horas.`);
    }

    cards.push({
      id: key,
      label: def.label,
      description: def.desc,
      enabled: true, // All crons exist and are deployed
      lastRun,
      successCount,
      failureCount,
      totalProcessed: allMatches.length,
    });
  }

  // Build recent logs from system events (last 50)
  const recentLogs: AutomationLogEntry[] = systemEvents.slice(0, 50).map((e) => ({
    id: e.id,
    timestamp: e.createdAt.toISOString(),
    automation: e.source,
    status: e.severity === "error" || e.severity === "critical" ? "failure" : e.severity === "warn" ? "failure" : "success",
    message: e.message,
    entityType: e.entityType,
    entityId: e.entityId,
    metadata: e.metadataJson ? JSON.parse(e.metadataJson) : null,
  }));

  return { cards, recentLogs, healthWarnings };
}
