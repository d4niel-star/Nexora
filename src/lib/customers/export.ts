"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { requireRateLimit } from "@/lib/rate-limit";
import { logSystemEvent } from "@/lib/observability/audit";
import { classifyCustomer } from "./segments";

// ─── Customer CSV Export (Phase 7C.1.C) ──────────────────────────────
// Two paths:
//   1. Inline export — bounded to 5,000 rows. Returns CSV string
//      directly. Acceptable for the typical SMB merchant.
//   2. Async export (queue-backed) — TODO: enqueue a `csv_export` job
//      that writes to object storage and emails the link. Wiring is
//      ready (the job type already exists in 7A.2 + 7A.5 timeout). We
//      stub the producer here and document the pending pieces.
//
// Inline export is rate-limited (3/min per actor) to discourage
// scripted bulk extraction. Every export is audit-logged.

const INLINE_LIMIT = 5_000;

export interface CustomerExportFilter {
  /** Restrict to customers with this segment. */
  segment?: string;
  /** Search prefix on email / name. */
  search?: string;
}

export async function exportCustomersInlineAction(filter: CustomerExportFilter = {}): Promise<{ filename: string; csv: string; rows: number }> {
  const actor = await requirePermission("exports.manage");

  await requireRateLimit({
    key: `customer_export:user:${actor.userId}`,
    limit: 3,
    windowMs: 60_000,
    route: "customers.export.inline",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  // Aggregate orders per customer (email-keyed)
  const orders = await prisma.order.findMany({
    where: { storeId: actor.storeId, status: { not: "cancelled" } },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      total: true,
      currency: true,
      refundAmount: true,
      status: true,
      createdAt: true,
      channel: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50_000, // bounded source set
  });

  const map = new Map<string, {
    email: string;
    name: string;
    phone: string | null;
    channel: string | null;
    totalOrders: number;
    cancelled: number;
    lifetimeValue: number;
    refundedTotal: number;
    firstOrderAt: Date;
    lastOrderAt: Date;
    currency: string;
  }>();

  for (const o of orders) {
    const key = o.email.toLowerCase();
    const existing = map.get(key);
    const isCancelled = o.status === "cancelled";
    if (!existing) {
      map.set(key, {
        email: key,
        name: `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || "Sin nombre",
        phone: o.phone,
        channel: o.channel,
        totalOrders: isCancelled ? 0 : 1,
        cancelled: isCancelled ? 1 : 0,
        lifetimeValue: isCancelled ? 0 : o.total,
        refundedTotal: o.refundAmount ?? 0,
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
        currency: o.currency || "ARS",
      });
    } else {
      if (!isCancelled) {
        existing.totalOrders += 1;
        existing.lifetimeValue += o.total;
      } else {
        existing.cancelled += 1;
      }
      existing.refundedTotal += o.refundAmount ?? 0;
      if (o.createdAt < existing.firstOrderAt) existing.firstOrderAt = o.createdAt;
      if (o.createdAt > existing.lastOrderAt) existing.lastOrderAt = o.createdAt;
    }
  }

  let rows = Array.from(map.values());

  // Filters
  if (filter.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter((r) => r.email.includes(q) || r.name.toLowerCase().includes(q));
  }
  if (filter.segment) {
    rows = rows.filter((r) => {
      const stats = {
        email: r.email,
        totalOrders: r.totalOrders,
        lifetimeValue: r.lifetimeValue,
        refundedTotal: r.refundedTotal,
        cancellationRate: (r.totalOrders + r.cancelled) > 0 ? r.cancelled / (r.totalOrders + r.cancelled) : 0,
        lastOrderAt: r.lastOrderAt.toISOString(),
        firstOrderAt: r.firstOrderAt.toISOString(),
        abandonedCarts: 0,
        currency: r.currency,
      };
      return classifyCustomer(stats).includes(filter.segment as never);
    });
  }

  // Cap at INLINE_LIMIT for safety
  if (rows.length > INLINE_LIMIT) {
    rows = rows.slice(0, INLINE_LIMIT);
  }

  // CSV serialization — RFC-4180 quoting
  const header = [
    "email", "name", "phone", "channel",
    "total_orders", "cancellations", "lifetime_value", "refunded_total",
    "currency", "first_order_at", "last_order_at",
  ].join(",");
  const lines = rows.map((r) => [
    csvCell(r.email),
    csvCell(r.name),
    csvCell(r.phone ?? ""),
    csvCell(r.channel ?? ""),
    r.totalOrders,
    r.cancelled,
    r.lifetimeValue.toFixed(2),
    r.refundedTotal.toFixed(2),
    r.currency,
    r.firstOrderAt.toISOString(),
    r.lastOrderAt.toISOString(),
  ].join(","));

  const csv = [header, ...lines].join("\n");
  const filename = `nexora-customers-${new Date().toISOString().slice(0, 10)}.csv`;

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "export",
    entityId: filename,
    eventType: "customers_exported",
    severity: "info",
    source: "admin_panel",
    message: `Customers exported (${rows.length} rows)`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { rows: rows.length, filter, inline: true },
  });

  return { filename, csv, rows: rows.length };
}

function csvCell(v: string): string {
  // Quote if contains comma, quote, or newline. Escape inner quotes.
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
