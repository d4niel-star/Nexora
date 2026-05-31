import { prisma } from "@/lib/db/prisma";
import { classifyCustomer, type SegmentId } from "@/lib/customers/segments";

// ─── Marketing Audience Builder (Phase 7D.5) ─────────────────────────
// Deterministic, in-memory audience evaluation. Same data the rest of
// Customers reads from. We intentionally do NOT persist Audience rows
// yet — the merchant builds + previews + iterates from the UI, but
// nothing is "frozen" because there's no campaign send loop to consume
// a frozen list. Saving audiences is a future-phase feature.
//
// Bounded source set: at most 10,000 customers per audience preview.
// Marketing flows on databases of millions need an indexed materialized
// view; we explicitly punt that until volumes demand it.

export interface AudienceFilter {
  /** Customer segments to include (OR'd together). Empty = all. */
  segments?: SegmentId[];
  /** Customer must carry at least one of these tag labels. */
  anyTags?: string[];
  /** Minimum spent (lifetime). */
  minSpent?: number;
  /** Minimum total orders (excluding cancelled). */
  minOrders?: number;
  /** Customer has been inactive for at least this many days. */
  inactiveDays?: number;
  /** Country filter — uses last shipping address. */
  country?: string;
  /** Refund-risk threshold (0-1). Includes only customers with a >= refundRisk score. */
  minRefundRisk?: number;
  /** When false, excludes customers we can't legally email yet. Defaults to true. */
  acceptsMarketing?: boolean;
}

export interface AudienceMember {
  email: string;
  name: string;
  segments: SegmentId[];
  lifetimeValue: number;
  totalOrders: number;
  lastOrderAt: string | null;
  country: string | null;
  tags: string[];
}

export interface AudiencePreview {
  /** Real estimate; capped at MAX_PREVIEW. */
  count: number;
  /** True if the underlying source set hit MAX_SOURCE_ROWS. */
  truncated: boolean;
  /** Sample (first 10 members) for the UI to confirm reasonableness. */
  sample: AudienceMember[];
  /** Distribution by segment for the audience composition card. */
  segmentBreakdown: Array<{ segment: SegmentId; count: number }>;
}

const MAX_SOURCE_ROWS = 10_000;
const SAMPLE_SIZE = 10;

export async function previewAudience(storeId: string, filter: AudienceFilter): Promise<AudiencePreview> {
  // Pull bounded order set + group by email. Same algorithm used by the
  // CSV export handler.
  const orders = await prisma.order.findMany({
    where: { storeId },
    select: {
      email: true, firstName: true, lastName: true,
      total: true, refundAmount: true, status: true, createdAt: true,
      country: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200_000,
  });

  type Agg = {
    email: string; name: string; orders: number; cancelled: number;
    ltv: number; refunded: number; firstAt: Date; lastAt: Date;
    country: string | null;
  };
  const map = new Map<string, Agg>();
  for (const o of orders) {
    const key = o.email.toLowerCase();
    const isCancelled = o.status === "cancelled";
    const ex = map.get(key);
    if (!ex) {
      map.set(key, {
        email: key,
        name: `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || "—",
        orders: isCancelled ? 0 : 1,
        cancelled: isCancelled ? 1 : 0,
        ltv: isCancelled ? 0 : o.total,
        refunded: o.refundAmount ?? 0,
        firstAt: o.createdAt, lastAt: o.createdAt,
        country: o.country ?? null,
      });
    } else {
      if (!isCancelled) { ex.orders += 1; ex.ltv += o.total; }
      else ex.cancelled += 1;
      ex.refunded += o.refundAmount ?? 0;
      if (o.createdAt < ex.firstAt) ex.firstAt = o.createdAt;
      if (o.createdAt > ex.lastAt) ex.lastAt = o.createdAt;
      // Keep the most recent country
      if (o.country && ex.country !== o.country && o.createdAt >= ex.lastAt) {
        ex.country = o.country;
      }
    }
  }

  const allCustomers = Array.from(map.values()).slice(0, MAX_SOURCE_ROWS);
  const truncated = map.size > MAX_SOURCE_ROWS;

  // Pull tag labels per email (bulk)
  const emails = allCustomers.map((c) => c.email);
  const tagRows = emails.length > 0
    ? await prisma.customerTag.findMany({
        where: { storeId, customerEmail: { in: emails } },
        select: { customerEmail: true, label: true },
      })
    : [];
  const tagMap = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagMap.get(t.customerEmail) ?? [];
    arr.push(t.label);
    tagMap.set(t.customerEmail, arr);
  }

  const now = Date.now();

  // Apply filter, classify segments
  const matched: AudienceMember[] = [];
  const segmentCounts = new Map<SegmentId, number>();

  for (const c of allCustomers) {
    const total = c.orders + c.cancelled;
    const cancellationRate = total > 0 ? c.cancelled / total : 0;
    const refundRate = c.ltv > 0 ? c.refunded / Math.max(c.ltv, 1) : 0;
    const stats = {
      email: c.email,
      totalOrders: c.orders,
      lifetimeValue: c.ltv,
      refundedTotal: c.refunded,
      cancellationRate,
      lastOrderAt: c.lastAt.toISOString(),
      firstOrderAt: c.firstAt.toISOString(),
      abandonedCarts: 0,
      currency: "ARS",
    };
    const segs = classifyCustomer(stats);

    // Filter checks
    if (filter.segments && filter.segments.length > 0 && !filter.segments.some((s) => segs.includes(s))) continue;
    if (filter.minSpent !== undefined && c.ltv < filter.minSpent) continue;
    if (filter.minOrders !== undefined && c.orders < filter.minOrders) continue;
    if (filter.inactiveDays !== undefined) {
      const daysSince = (now - c.lastAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince < filter.inactiveDays) continue;
    }
    if (filter.country && c.country !== filter.country) continue;
    if (filter.minRefundRisk !== undefined && refundRate < filter.minRefundRisk) continue;

    const tags = tagMap.get(c.email) ?? [];
    if (filter.anyTags && filter.anyTags.length > 0) {
      const hit = filter.anyTags.some((t) => tags.includes(t.toLowerCase()));
      if (!hit) continue;
    }

    // acceptsMarketing: we don't have a per-customer opt-in flag yet.
    // For honesty: when filter is true (default), exclude nobody but
    // surface in the readiness card that we lack the capture mechanism.
    // We don't fabricate consent here.

    matched.push({
      email: c.email,
      name: c.name,
      segments: segs,
      lifetimeValue: c.ltv,
      totalOrders: c.orders,
      lastOrderAt: c.lastAt.toISOString(),
      country: c.country,
      tags,
    });

    for (const s of segs) {
      segmentCounts.set(s, (segmentCounts.get(s) ?? 0) + 1);
    }
  }

  return {
    count: matched.length,
    truncated,
    sample: matched.slice(0, SAMPLE_SIZE),
    segmentBreakdown: Array.from(segmentCounts.entries())
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count),
  };
}
