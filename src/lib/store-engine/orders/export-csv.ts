"use server";

// ─── Server-side order CSV export ──────────────────────────────────────────
// Generates a real CSV string with all relevant order fields, respecting
// the same filters the admin UI uses (status, query, dateFrom, dateTo).
// Returns the CSV as a string — the client downloads it via Blob.
// Never loads all rows in memory: uses cursor-based batch streaming.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { logSystemEvent } from "@/lib/observability/audit";
import type { Prisma } from "@prisma/client";

interface ExportOrdersCsvOptions {
  status?: string;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: string;
  orderIds?: string[];
}

const CSV_HEADERS = [
  "orderNumber",
  "status",
  "paymentStatus",
  "shippingStatus",
  "customer",
  "email",
  "phone",
  "subtotal",
  "shippingAmount",
  "total",
  "currency",
  "shippingMethod",
  "trackingCode",
  "trackingUrl",
  "carrier",
  "itemsCount",
  "createdAt",
  "shippedAt",
  "deliveredAt",
  "cancelledAt",
] as const;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportOrdersCsv(
  options: ExportOrdersCsvOptions = {},
): Promise<{ success: true; csv: string; count: number } | { success: false; error: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const where: Prisma.OrderWhereInput = { storeId: store.id };

  if (options.orderIds && options.orderIds.length > 0) {
    where.id = { in: options.orderIds };
  } else {
    if (options.status && options.status !== "all") {
      where.status = options.status;
    }
    if (options.paymentStatus) {
      where.paymentStatus = options.paymentStatus;
    }
    if (options.query) {
      const q = options.query.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { trackingCode: { contains: q, mode: "insensitive" } },
      ];
    }
    if (options.dateFrom) {
      where.createdAt = { ...(where.createdAt as object ?? {}), gte: new Date(options.dateFrom) };
    }
    if (options.dateTo) {
      const to = new Date(options.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as object ?? {}), lte: to };
    }
  }

  const BATCH_SIZE = 500;
  const rows: string[] = [CSV_HEADERS.map(escapeCell).join(",")];
  let cursor: string | undefined;
  let totalCount = 0;

  while (true) {
    const batch = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        _count: { select: { items: true } },
      },
    });

    if (batch.length === 0) break;

    for (const o of batch) {
      rows.push(
        [
          o.orderNumber,
          o.status,
          o.paymentStatus,
          o.shippingStatus,
          `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim(),
          o.email,
          o.phone,
          o.subtotal,
          o.shippingAmount,
          o.total,
          o.currency,
          o.shippingMethodLabel,
          o.trackingCode,
          o.trackingUrl,
          o.shippingCarrier,
          o._count.items,
          o.createdAt.toISOString(),
          o.shippedAt?.toISOString() ?? "",
          o.deliveredAt?.toISOString() ?? "",
          o.cancelledAt?.toISOString() ?? "",
        ]
          .map(escapeCell)
          .join(","),
      );
    }

    totalCount += batch.length;
    cursor = batch[batch.length - 1].id;

    if (batch.length < BATCH_SIZE) break;
    if (totalCount >= 10000) break; // safety cap
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "order",
    eventType: "orders_csv_exported",
    source: "admin_backend",
    message: `Exportados ${totalCount} pedidos a CSV`,
    metadata: { count: totalCount, filters: options },
  });

  return { success: true, csv: "\ufeff" + rows.join("\r\n"), count: totalCount };
}
