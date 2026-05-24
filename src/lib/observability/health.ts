import { prisma } from "@/lib/db/prisma";
import { snapshotAllBreakers } from "@/lib/resilience/circuit-breaker";

export interface SystemHealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: string;
  subsystems: {
    database: SubsystemStatus;
    orders: SubsystemStatus;
    payments: SubsystemStatus;
    emails: SubsystemStatus;
    logistics: SubsystemStatus;
    queue: SubsystemStatus;
  };
  // Phase 7B.5 — extended observability
  queueDetails: {
    pending: number;
    running: number;
    dead24h: number;
    /** Age (ms) of the oldest pending job. Indicates queue lag. */
    oldestPendingMs: number | null;
  };
  rateLimitPressure: {
    activeBuckets: number;
    triggered24h: number;
  };
  circuitBreakers: Array<{
    name: string;
    state: "closed" | "open" | "half_open";
    failures: number;
    openedAt: number | null;
  }>;
  recentActivity: RecentActivityItem[];
  recentErrors: RecentActivityItem[];
}

interface SubsystemStatus {
  status: "ok" | "warn" | "error";
  message: string;
  metric?: number;
}

export interface RecentActivityItem {
  id: string;
  eventType: string;
  severity: string;
  source: string;
  message: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

const startTime = Date.now();

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run all queries in parallel for speed
  const [
    dbCheck,
    recentOrders,
    failedPayments24h,
    failedEmails24h,
    failedWebhooks24h,
    recentEvents,
    recentErrorEvents,
  ] = await Promise.all([
    // 1. Database connectivity
    prisma.$queryRawUnsafe("SELECT 1 as ok").then(() => true).catch(() => false),

    // 2. Recent orders (last 24h)
    prisma.order.count({ where: { createdAt: { gte: last24h } } }),

    // 3. Failed payments (last 24h)
    prisma.systemEvent.count({
      where: { eventType: { contains: "failed" }, entityType: "payment", createdAt: { gte: last24h } }
    }),

    // 4. Failed emails (last 24h)
    prisma.emailLog.count({
      where: { status: "failed", createdAt: { gte: last24h } }
    }),

    // 5. Failed logistics webhooks (last 24h)
    prisma.carrierWebhookLog.count({
      where: { status: "failed", processedAt: { gte: last24h } }
    }),

    // 6. Recent activity (last 20 events)
    prisma.systemEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // 7. Recent errors (last 10)
    prisma.systemEvent.findMany({
      where: { severity: { in: ["error", "critical"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Queue health: pending backlog + dead jobs in last 24h + lag (oldest pending)
  const [pendingJobs, deadJobs24h, runningJobs, oldestPending, activeBuckets, rateLimitTriggered24h] = await Promise.all([
    prisma.job.count({ where: { status: "pending", runAt: { lte: now } } }),
    prisma.job.count({ where: { status: "dead", finishedAt: { gte: last24h } } }),
    prisma.job.count({ where: { status: "running" } }),
    prisma.job.findFirst({
      where: { status: "pending", runAt: { lte: now } },
      orderBy: { runAt: "asc" },
      select: { runAt: true },
    }),
    prisma.rateLimitBucket.count({ where: { resetAt: { gt: now } } }),
    prisma.systemEvent.count({ where: { eventType: "rate_limit_triggered", createdAt: { gte: last24h } } }),
  ]);

  const oldestPendingMs = oldestPending?.runAt ? Math.max(0, now.getTime() - oldestPending.runAt.getTime()) : null;
  const breakerSnapshots = snapshotAllBreakers().map((b) => ({
    name: b.name,
    state: b.state,
    failures: b.failures,
    openedAt: b.openedAt,
  }));

  const uptimeMs = Date.now() - startTime;
  const uptimeHours = Math.floor(uptimeMs / 3600000);
  const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000);

  const database: SubsystemStatus = dbCheck
    ? { status: "ok", message: "Base de datos operativa" }
    : { status: "error", message: "Base de datos no responde" };

  const orders: SubsystemStatus = {
    status: "ok",
    message: `${recentOrders} órdenes en las últimas 24h`,
    metric: recentOrders,
  };

  const payments: SubsystemStatus = failedPayments24h === 0
    ? { status: "ok", message: "Sin fallos de pago recientes", metric: 0 }
    : { status: "warn", message: `${failedPayments24h} fallos de pago en 24h`, metric: failedPayments24h };

  const emails: SubsystemStatus = failedEmails24h === 0
    ? { status: "ok", message: "Todos los emails enviados correctamente", metric: 0 }
    : { status: "warn", message: `${failedEmails24h} emails fallidos en 24h`, metric: failedEmails24h };

  const logistics: SubsystemStatus = failedWebhooks24h === 0
    ? { status: "ok", message: "Webhooks logísticos procesados correctamente", metric: 0 }
    : { status: "warn", message: `${failedWebhooks24h} webhooks fallidos en 24h`, metric: failedWebhooks24h };

  // Queue health: backlog over 100 = warn; dead jobs > 0 = warn
  const queue: SubsystemStatus = (() => {
    if (deadJobs24h > 0) {
      return { status: "warn" as const, message: `${deadJobs24h} jobs muertos en 24h, ${pendingJobs} pendientes`, metric: pendingJobs };
    }
    if (pendingJobs > 100) {
      return { status: "warn" as const, message: `Cola con ${pendingJobs} jobs pendientes (backlog)`, metric: pendingJobs };
    }
    return { status: "ok" as const, message: `${pendingJobs} pendientes, ${runningJobs} en proceso`, metric: pendingJobs };
  })();

  // Determine overall status
  const hasErrors = !dbCheck;
  const hasWarnings = failedPayments24h > 0 || failedEmails24h > 0 || failedWebhooks24h > 0 || queue.status === "warn";

  const overallStatus = hasErrors ? "unhealthy" : hasWarnings ? "degraded" : "healthy";

  const mapEvent = (e: any): RecentActivityItem => ({
    id: e.id,
    eventType: e.eventType,
    severity: e.severity,
    source: e.source,
    message: e.message,
    entityType: e.entityType,
    entityId: e.entityId,
    createdAt: e.createdAt.toISOString(),
  });

  return {
    status: overallStatus,
    uptime: `${uptimeHours}h ${uptimeMins}m`,
    subsystems: { database, orders, payments, emails, logistics, queue },
    queueDetails: {
      pending: pendingJobs,
      running: runningJobs,
      dead24h: deadJobs24h,
      oldestPendingMs,
    },
    rateLimitPressure: {
      activeBuckets,
      triggered24h: rateLimitTriggered24h,
    },
    circuitBreakers: breakerSnapshots,
    recentActivity: recentEvents.map(mapEvent),
    recentErrors: recentErrorEvents.map(mapEvent),
  };
}
