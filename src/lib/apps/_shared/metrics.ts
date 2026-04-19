// ─── Shared · App observability metrics ───
// Honest, tenant-scoped metrics read straight from EmailLog. Used by
// whatsapp-recovery and post-purchase-flows setup pages. Every figure is
// derived from a real row written by the app's cron; nothing is inferred,
// estimated or projected.
//
// What is NOT here (on purpose):
//   - open rate / click rate / conversion rate. EmailLog does not have
//     signals for any of those, so we simply do not expose them.
//   - revenue attribution.
//   - benchmarks or comparisons against "industry average".

import { prisma } from "@/lib/db/prisma";

export interface AppEmailMetrics {
  /** Rows with status=sent in the last 7 days for this tenant and event. */
  sentLast7d: number;
  /** Rows with status=sent in the last 30 days. */
  sentLast30d: number;
  /** Total historical sent count for this tenant and event. */
  sentTotal: number;
  /** Rows with status=failed in the last 30 days (diagnostic). */
  failedLast30d: number;
  /** Timestamp of the most recent sent row. null when nothing was ever
   *  sent — callers MUST handle null as "sin actividad todavía". */
  lastSentAt: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY: AppEmailMetrics = {
  sentLast7d: 0,
  sentLast30d: 0,
  sentTotal: 0,
  failedLast30d: 0,
  lastSentAt: null,
};

/**
 * Fetch observability metrics for a single app/event pair scoped to a
 * tenant. Fail-closed: any error returns EMPTY so the setup page never
 * renders bogus numbers or 500s.
 */
export async function getAppEmailMetrics(
  storeId: string,
  eventType: string,
): Promise<AppEmailMetrics> {
  try {
    const now = Date.now();
    const cutoff7d = new Date(now - 7 * DAY_MS);
    const cutoff30d = new Date(now - 30 * DAY_MS);

    const [sentLast7d, sentLast30d, sentTotal, failedLast30d, lastSent] =
      await Promise.all([
        prisma.emailLog.count({
          where: {
            storeId,
            eventType,
            status: "sent",
            sentAt: { gte: cutoff7d },
          },
        }),
        prisma.emailLog.count({
          where: {
            storeId,
            eventType,
            status: "sent",
            sentAt: { gte: cutoff30d },
          },
        }),
        prisma.emailLog.count({
          where: { storeId, eventType, status: "sent" },
        }),
        prisma.emailLog.count({
          where: {
            storeId,
            eventType,
            status: "failed",
            createdAt: { gte: cutoff30d },
          },
        }),
        prisma.emailLog.findFirst({
          where: { storeId, eventType, status: "sent" },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true },
        }),
      ]);

    return {
      sentLast7d,
      sentLast30d,
      sentTotal,
      failedLast30d,
      lastSentAt: lastSent?.sentAt ?? null,
    };
  } catch {
    return EMPTY;
  }
}
