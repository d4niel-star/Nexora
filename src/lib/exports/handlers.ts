import { prisma } from "@/lib/db/prisma";
import { registerJobHandler, PermanentJobError } from "@/lib/jobs/types";
import type { JobHandlerContext, JobHandlerResult } from "@/lib/jobs/types";
import { writeArtifactReady, writeArtifactFailed, MAX_ROWS } from "./storage";
import { buildCsv } from "./csv";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Export Job Handlers (Phase 7D.4) ────────────────────────────────
// Registered job types: export.customers, export.orders, export.inventory,
// export.analytics. Each handler:
//   1. Pulls a bounded slice of rows for the artifact's storeId.
//   2. Builds a UTF-8-BOM CSV via buildCsv.
//   3. Writes to ExportArtifact.csvContent + flips status to ready.
//   4. Audit-logs `export_generated`.
//
// On failure (validation, query error), we mark the artifact failed with
// a sanitized error message and let the queue layer record the
// `job_failed`/`job_dead` SystemEvent. Validation errors are PermanentJobError
// so retrying won't help.

let registered = false;

function getArtifactId(ctx: JobHandlerContext): string {
  const id = ctx.payload.artifactId;
  if (typeof id !== "string" || id.length === 0) {
    throw new PermanentJobError("export job missing payload.artifactId");
  }
  return id;
}

async function loadArtifact(artifactId: string, expectedType: string) {
  const a = await prisma.exportArtifact.findUnique({ where: { id: artifactId } });
  if (!a) throw new PermanentJobError(`Artifact ${artifactId} not found`);
  if (a.type !== expectedType) {
    throw new PermanentJobError(`Artifact ${artifactId} is type=${a.type}, expected ${expectedType}`);
  }
  if (a.status !== "pending") {
    // Already-ready / already-failed jobs are no-op safe to retry.
    return null;
  }
  return a;
}

// ─── export.customers ───
async function customersHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const artifactId = getArtifactId(ctx);
  const artifact = await loadArtifact(artifactId, "customers");
  if (!artifact) return { ok: true, metadata: { artifactId, skipped: "not_pending" } };
  const storeId = artifact.storeId;

  try {
    // Aggregate orders → per-customer stats. Bounded.
    const orders = await prisma.order.findMany({
      where: { storeId },
      select: {
        email: true, firstName: true, lastName: true, phone: true,
        total: true, currency: true, refundAmount: true, status: true,
        createdAt: true, channel: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200_000, // raw row cap; aggregated rows always ≤ MAX_ROWS
    });

    type Agg = {
      email: string; name: string; phone: string | null; channel: string | null;
      orders: number; cancelled: number; ltv: number; refunded: number;
      first: Date; last: Date; currency: string;
    };
    const map = new Map<string, Agg>();
    for (const o of orders) {
      const key = o.email.toLowerCase();
      const isCancelled = o.status === "cancelled";
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          email: key,
          name: `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || "—",
          phone: o.phone, channel: o.channel,
          orders: isCancelled ? 0 : 1,
          cancelled: isCancelled ? 1 : 0,
          ltv: isCancelled ? 0 : o.total,
          refunded: o.refundAmount ?? 0,
          first: o.createdAt, last: o.createdAt,
          currency: o.currency || "ARS",
        });
      } else {
        if (!isCancelled) { existing.orders += 1; existing.ltv += o.total; }
        else existing.cancelled += 1;
        existing.refunded += o.refundAmount ?? 0;
        if (o.createdAt < existing.first) existing.first = o.createdAt;
        if (o.createdAt > existing.last) existing.last = o.createdAt;
      }
    }

    let rows = Array.from(map.values());
    if (rows.length > MAX_ROWS) rows = rows.slice(0, MAX_ROWS);

    const csv = buildCsv(
      ["email", "name", "phone", "channel", "total_orders", "cancellations", "lifetime_value", "refunded_total", "currency", "first_order_at", "last_order_at"],
      rows.map((r) => [
        r.email, r.name, r.phone ?? "", r.channel ?? "",
        r.orders, r.cancelled, r.ltv.toFixed(2), r.refunded.toFixed(2),
        r.currency, r.first.toISOString(), r.last.toISOString(),
      ]),
    );

    await writeArtifactReady({ artifactId, csv, rowCount: rows.length });
    await logSystemEvent({
      storeId, entityType: "export", entityId: artifactId,
      eventType: "export_generated", severity: "info", source: "queue",
      message: `Customers export ready: ${rows.length} rows`,
      metadata: { type: "customers", rowCount: rows.length, fileSize: csv.length },
    });
    return { ok: true, metadata: { artifactId, rowCount: rows.length } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await writeArtifactFailed(artifactId, msg);
    if (err instanceof PermanentJobError) throw err;
    return { ok: false, error: msg };
  }
}

// ─── export.orders ───
async function ordersHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const artifactId = getArtifactId(ctx);
  const artifact = await loadArtifact(artifactId, "orders");
  if (!artifact) return { ok: true, metadata: { artifactId, skipped: "not_pending" } };
  const storeId = artifact.storeId;

  try {
    const orders = await prisma.order.findMany({
      where: { storeId },
      select: {
        orderNumber: true, email: true, firstName: true, lastName: true,
        total: true, currency: true, status: true, paymentStatus: true,
        shippingStatus: true, refundAmount: true, channel: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
    });

    const csv = buildCsv(
      ["order_number", "email", "name", "total", "currency", "status", "payment_status", "shipping_status", "refund_amount", "channel", "created_at"],
      orders.map((o) => [
        o.orderNumber, o.email, `${o.firstName} ${o.lastName}`.trim(),
        o.total.toFixed(2), o.currency, o.status, o.paymentStatus,
        o.shippingStatus ?? "", (o.refundAmount ?? 0).toFixed(2),
        o.channel ?? "", o.createdAt.toISOString(),
      ]),
    );

    await writeArtifactReady({ artifactId, csv, rowCount: orders.length });
    await logSystemEvent({
      storeId, entityType: "export", entityId: artifactId,
      eventType: "export_generated", severity: "info", source: "queue",
      message: `Orders export ready: ${orders.length} rows`,
      metadata: { type: "orders", rowCount: orders.length, fileSize: csv.length },
    });
    return { ok: true, metadata: { artifactId, rowCount: orders.length } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await writeArtifactFailed(artifactId, msg);
    if (err instanceof PermanentJobError) throw err;
    return { ok: false, error: msg };
  }
}

// ─── export.inventory ───
async function inventoryHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const artifactId = getArtifactId(ctx);
  const artifact = await loadArtifact(artifactId, "inventory");
  if (!artifact) return { ok: true, metadata: { artifactId, skipped: "not_pending" } };
  const storeId = artifact.storeId;

  try {
    const variants = await prisma.productVariant.findMany({
      where: { product: { storeId } },
      select: {
        id: true, sku: true, title: true,
        price: true, compareAtPrice: true,
        product: { select: { id: true, title: true } },
        localInventories: { select: { stock: true, lowStockThreshold: true } },
      },
      take: MAX_ROWS,
    });

    const csv = buildCsv(
      ["product_id", "product_title", "variant_id", "variant_title", "sku", "price", "compare_at_price", "total_stock", "low_threshold_min"],
      variants.map((v) => {
        const totalStock = v.localInventories.reduce((s, li) => s + li.stock, 0);
        const minThresh = v.localInventories.length > 0
          ? Math.min(...v.localInventories.map((li) => li.lowStockThreshold))
          : 0;
        return [
          v.product.id, v.product.title, v.id, v.title, v.sku ?? "",
          v.price.toFixed(2), v.compareAtPrice?.toFixed(2) ?? "",
          totalStock, minThresh,
        ];
      }),
    );

    await writeArtifactReady({ artifactId, csv, rowCount: variants.length });
    await logSystemEvent({
      storeId, entityType: "export", entityId: artifactId,
      eventType: "export_generated", severity: "info", source: "queue",
      message: `Inventory export ready: ${variants.length} rows`,
      metadata: { type: "inventory", rowCount: variants.length, fileSize: csv.length },
    });
    return { ok: true, metadata: { artifactId, rowCount: variants.length } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await writeArtifactFailed(artifactId, msg);
    if (err instanceof PermanentJobError) throw err;
    return { ok: false, error: msg };
  }
}

// ─── export.analytics ───
// Honest summary: a flat file of revenue per day for the last 365 days.
async function analyticsHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const artifactId = getArtifactId(ctx);
  const artifact = await loadArtifact(artifactId, "analytics");
  if (!artifact) return { ok: true, metadata: { artifactId, skipped: "not_pending" } };
  const storeId = artifact.storeId;

  try {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: { storeId, createdAt: { gte: cutoff }, status: { not: "cancelled" } },
      select: { createdAt: true, total: true, refundAmount: true, currency: true },
      take: 50_000,
    });

    type Row = { gross: number; refunded: number; orders: number; currency: string };
    const byDay = new Map<string, Row>();
    for (const o of orders) {
      const d = o.createdAt;
      const key = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
      const ex = byDay.get(key) ?? { gross: 0, refunded: 0, orders: 0, currency: o.currency || "ARS" };
      ex.gross += o.total;
      ex.refunded += o.refundAmount ?? 0;
      ex.orders += 1;
      byDay.set(key, ex);
    }

    const sorted = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    const csv = buildCsv(
      ["day", "orders", "gross_revenue", "refunded", "net_revenue", "currency"],
      sorted.map(([day, r]) => [day, r.orders, r.gross.toFixed(2), r.refunded.toFixed(2), Math.max(0, r.gross - r.refunded).toFixed(2), r.currency]),
    );

    await writeArtifactReady({ artifactId, csv, rowCount: sorted.length });
    await logSystemEvent({
      storeId, entityType: "export", entityId: artifactId,
      eventType: "export_generated", severity: "info", source: "queue",
      message: `Analytics export ready: ${sorted.length} days`,
      metadata: { type: "analytics", rowCount: sorted.length, fileSize: csv.length },
    });
    return { ok: true, metadata: { artifactId, days: sorted.length } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await writeArtifactFailed(artifactId, msg);
    if (err instanceof PermanentJobError) throw err;
    return { ok: false, error: msg };
  }
}

export function ensureExportHandlersRegistered(): void {
  if (registered) return;
  registered = true;
  registerJobHandler("export.customers", customersHandler);
  registerJobHandler("export.orders", ordersHandler);
  registerJobHandler("export.inventory", inventoryHandler);
  registerJobHandler("export.analytics", analyticsHandler);
}
