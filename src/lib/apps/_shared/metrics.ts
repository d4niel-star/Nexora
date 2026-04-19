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

  // ─── Click tracking (V3.3) ───
  // Populated only when the app's template wraps its CTA with
  // buildTrackedUrl. When null the UI must NOT render click stats — a
  // missing number is honest; a zero could be mistaken for "nobody
  // clicked".
  /** Sum of EmailLog.clickCount across all rows of this event/tenant. */
  clicksTotal: number | null;
  /** Clicks produced in the last 30 days (clickCount for rows whose
   *  lastClickedAt is within the window). */
  clicksLast30d: number | null;
  /** Most recent click timestamp. null when nothing was ever clicked. */
  lastClickedAt: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY: AppEmailMetrics = {
  sentLast7d: 0,
  sentLast30d: 0,
  sentTotal: 0,
  failedLast30d: 0,
  lastSentAt: null,
  clicksTotal: null,
  clicksLast30d: null,
  lastClickedAt: null,
};

/**
 * Fetch observability metrics for a single app/event pair scoped to a
 * tenant. Fail-closed: any error returns EMPTY so the setup page never
 * renders bogus numbers or 500s.
 *
 * Click metrics are opt-in via `options.trackClicks`. Only pass true for
 * apps whose templates actually wrap CTAs with buildTrackedUrl — else
 * the numbers would be misleading zeros.
 */
export async function getAppEmailMetrics(
  storeId: string,
  eventType: string,
  options: { trackClicks?: boolean } = {},
): Promise<AppEmailMetrics> {
  const trackClicks = options.trackClicks === true;
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

    // Click metrics require a second pass only when trackClicks is on.
    // Keep them null for non-tracked apps so the UI hides the section.
    let clicksTotal: number | null = null;
    let clicksLast30d: number | null = null;
    let lastClickedAt: Date | null = null;

    if (trackClicks) {
      const [totalAgg, last30Agg, lastClickRow] = await Promise.all([
        prisma.emailLog.aggregate({
          where: { storeId, eventType, clickCount: { gt: 0 } },
          _sum: { clickCount: true },
        }),
        prisma.emailLog.aggregate({
          where: {
            storeId,
            eventType,
            clickCount: { gt: 0 },
            lastClickedAt: { gte: cutoff30d },
          },
          _sum: { clickCount: true },
        }),
        prisma.emailLog.findFirst({
          where: { storeId, eventType, clickCount: { gt: 0 } },
          orderBy: { lastClickedAt: "desc" },
          select: { lastClickedAt: true },
        }),
      ]);
      clicksTotal = totalAgg._sum.clickCount ?? 0;
      clicksLast30d = last30Agg._sum.clickCount ?? 0;
      lastClickedAt = lastClickRow?.lastClickedAt ?? null;
    }

    return {
      sentLast7d,
      sentLast30d,
      sentTotal,
      failedLast30d,
      lastSentAt: lastSent?.sentAt ?? null,
      clicksTotal,
      clicksLast30d,
      lastClickedAt,
    };
  } catch {
    return EMPTY;
  }
}
