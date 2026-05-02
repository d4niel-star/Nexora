// ─── costSnapshot Backfill Script ────────────────────────────────────────
//
// Detects historic OrderItems with costSnapshot = 0 and backfills them
// from the current Product.cost value.
//
// IMPORTANT: This uses the CURRENT product cost, which may differ from
// the cost at the time of the original sale. All backfilled values are
// marked as "estimated from current product cost" in the audit log.
//
// Usage:
//   npx tsx scripts/backfill-cost-snapshots.ts --dry-run
//   npx tsx scripts/backfill-cost-snapshots.ts --apply
//   npx tsx scripts/backfill-cost-snapshots.ts --dry-run --storeId=<id>
//   npx tsx scripts/backfill-cost-snapshots.ts --apply --limit=500
//
// Flags:
//   --dry-run    (default) Scan and report without modifying data
//   --apply      Actually update records in the database
//   --storeId=X  Limit to a specific store
//   --limit=N    Max OrderItems to process (default: unlimited)
//   --paid-only  Only backfill items on paid/approved orders

// Env is loaded via --env-file flags in the npm script / CLI invocation.
import { prisma } from "../src/lib/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────────

interface AuditSummary {
  scannedItems: number;
  candidates: number;
  backfillable: number;
  skippedNoProduct: number;
  skippedNoProductCost: number;
  skippedAlreadyFilled: number;
  estimatedCostToBackfill: number;
  affectedOrders: number;
  affectedStores: number;
}

interface BackfillResult extends AuditSummary {
  itemsUpdated: number;
  eventsCreated: number;
  dryRun: boolean;
  details: BackfillDetail[];
}

interface BackfillDetail {
  orderItemId: string;
  orderId: string;
  orderNumber: string | null;
  productId: string | null;
  productTitle: string;
  quantity: number;
  priceSnapshot: number;
  oldCostSnapshot: number;
  newCostSnapshot: number;
  estimatedMarginBefore: string;
  estimatedMarginAfter: string;
  action: "updated" | "skipped";
  reason: string;
}

interface BackfillOptions {
  dryRun: boolean;
  storeId?: string;
  limit?: number;
  paidOnly?: boolean;
}

// ─── Status filters ─────────────────────────────────────────────────────

const PAID_STATUSES = ["paid", "approved", "processing", "shipped", "delivered"];

// ─── Core Backfill Logic ────────────────────────────────────────────────

async function backfillOrderItemCostSnapshots(
  options: BackfillOptions,
): Promise<BackfillResult> {
  const { dryRun, storeId, limit, paidOnly } = options;

  // Build where clause for OrderItems with costSnapshot = 0
  const itemWhere: Record<string, any> = {
    costSnapshot: { lte: 0 },
  };

  // Order-level filters
  const orderWhere: Record<string, any> = {};
  if (storeId) orderWhere.storeId = storeId;
  if (paidOnly) orderWhere.status = { in: PAID_STATUSES };

  if (Object.keys(orderWhere).length > 0) {
    itemWhere.order = orderWhere;
  }

  // Fetch candidate items with product and order data
  const candidates = await prisma.orderItem.findMany({
    where: itemWhere,
    include: {
      product: { select: { id: true, title: true, cost: true } },
      order: { select: { id: true, orderNumber: true, storeId: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  // Count items that already have valid costSnapshot
  const alreadyFilled = await prisma.orderItem.count({
    where: {
      costSnapshot: { gt: 0 },
      ...(storeId ? { order: { storeId } } : {}),
    },
  });

  const details: BackfillDetail[] = [];
  const affectedOrderIds = new Set<string>();
  const affectedStoreIds = new Set<string>();
  let backfillable = 0;
  let skippedNoProduct = 0;
  let skippedNoProductCost = 0;
  let estimatedCostToBackfill = 0;
  let itemsUpdated = 0;

  for (const item of candidates) {
    const priceSnapshot = item.priceSnapshot;
    const oldCost = item.costSnapshot;

    // Skip: no product linked
    if (!item.product || !item.productId) {
      skippedNoProduct++;
      details.push({
        orderItemId: item.id,
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        productId: item.productId,
        productTitle: item.titleSnapshot || "(sin producto)",
        quantity: item.quantity,
        priceSnapshot,
        oldCostSnapshot: oldCost,
        newCostSnapshot: 0,
        estimatedMarginBefore: "N/A",
        estimatedMarginAfter: "N/A",
        action: "skipped",
        reason: "no_product_linked",
      });
      continue;
    }

    // Skip: product has no valid cost
    const productCost = item.product.cost;
    if (productCost === null || productCost === undefined || productCost <= 0) {
      skippedNoProductCost++;
      details.push({
        orderItemId: item.id,
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        productId: item.productId,
        productTitle: item.product.title,
        quantity: item.quantity,
        priceSnapshot,
        oldCostSnapshot: oldCost,
        newCostSnapshot: 0,
        estimatedMarginBefore: "N/A",
        estimatedMarginAfter: "N/A",
        action: "skipped",
        reason: "product_has_no_cost",
      });
      continue;
    }

    // This item can be backfilled
    backfillable++;
    const newCost = productCost;
    const totalCostForItem = newCost * item.quantity;
    estimatedCostToBackfill += totalCostForItem;
    affectedOrderIds.add(item.orderId);
    affectedStoreIds.add(item.order.storeId);

    const marginBefore = priceSnapshot > 0 ? "100%" : "N/A";
    const marginAfter =
      priceSnapshot > 0
        ? `${Math.round(((priceSnapshot - newCost) / priceSnapshot) * 100)}%`
        : "N/A";

    details.push({
      orderItemId: item.id,
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      productId: item.productId,
      productTitle: item.product.title,
      quantity: item.quantity,
      priceSnapshot,
      oldCostSnapshot: oldCost,
      newCostSnapshot: newCost,
      estimatedMarginBefore: marginBefore,
      estimatedMarginAfter: marginAfter,
      action: "updated",
      reason: "backfilled_from_current_product_cost",
    });

    // Apply if not dry-run
    if (!dryRun) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { costSnapshot: newCost },
      });
      itemsUpdated++;
    }
  }

  // Audit events (only on apply)
  let eventsCreated = 0;
  if (!dryRun && affectedStoreIds.size > 0) {
    for (const sid of affectedStoreIds) {
      const storeItems = details.filter(
        (d) =>
          d.action === "updated" &&
          candidates.find((c) => c.id === d.orderItemId)?.order.storeId === sid,
      );
      const storeOrders = new Set(storeItems.map((d) => d.orderId));

      await prisma.systemEvent.create({
        data: {
          storeId: sid,
          entityType: "order_item",
          entityId: "batch",
          eventType: "cost_snapshot_backfill_batch_completed",
          severity: "info",
          source: "backfill_script",
          message: `Backfill costSnapshot: ${storeItems.length} items en ${storeOrders.size} órdenes actualizados desde Product.cost actual.`,
          metadataJson: JSON.stringify({
            source: "current_product_cost",
            dryRun: false,
            itemsUpdated: storeItems.length,
            ordersAffected: storeOrders.size,
            estimatedTotalCost: storeItems.reduce(
              (sum, d) => sum + d.newCostSnapshot * d.quantity,
              0,
            ),
            skippedNoProduct,
            skippedNoProductCost,
            warning:
              "Backfilled from current Product.cost — may not reflect historical purchase cost",
          }),
        },
      });
      eventsCreated++;
    }
  }

  return {
    scannedItems: candidates.length + alreadyFilled,
    candidates: candidates.length,
    backfillable,
    skippedNoProduct,
    skippedNoProductCost,
    skippedAlreadyFilled: alreadyFilled,
    estimatedCostToBackfill,
    affectedOrders: affectedOrderIds.size,
    affectedStores: affectedStoreIds.size,
    itemsUpdated,
    eventsCreated,
    dryRun,
    details,
  };
}

// ─── CLI ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--paid-only") flags.paidOnly = true;
    else if (arg.startsWith("--storeId=")) flags.storeId = arg.split("=")[1];
    else if (arg.startsWith("--limit=")) flags.limit = arg.split("=")[1];
  }

  return flags;
}

async function main() {
  const flags = parseArgs();
  const dryRun = flags.apply !== true; // Default: dry-run

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  NEXORA — costSnapshot Backfill                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log(`  Mode:      ${dryRun ? "🔍 DRY RUN (no changes)" : "⚡ APPLY (will modify data)"}`);
  if (flags.storeId) console.log(`  Store:     ${flags.storeId}`);
  if (flags.limit) console.log(`  Limit:     ${flags.limit}`);
  if (flags.paidOnly) console.log(`  Filter:    paid orders only`);
  console.log(`  Source:    current Product.cost\n`);

  if (!dryRun) {
    console.log("  ⚠️  WARNING: This will modify financial data in the database.");
    console.log("  ⚠️  Backfilled costs are ESTIMATES from current Product.cost.\n");
  }

  const result = await backfillOrderItemCostSnapshots({
    dryRun,
    storeId: typeof flags.storeId === "string" ? flags.storeId : undefined,
    limit: typeof flags.limit === "string" ? parseInt(flags.limit, 10) : undefined,
    paidOnly: flags.paidOnly === true,
  });

  // Summary
  console.log("  ┌─────────────────────────────────────────────┐");
  console.log("  │ SUMMARY                                     │");
  console.log("  ├─────────────────────────────────────────────┤");
  console.log(`  │ Candidates (costSnapshot ≤ 0):  ${String(result.candidates).padStart(10)} │`);
  console.log(`  │ Backfillable:                   ${String(result.backfillable).padStart(10)} │`);
  console.log(`  │ Skipped (no product):           ${String(result.skippedNoProduct).padStart(10)} │`);
  console.log(`  │ Skipped (no product cost):      ${String(result.skippedNoProductCost).padStart(10)} │`);
  console.log(`  │ Already filled (costSnapshot>0):${String(result.skippedAlreadyFilled).padStart(10)} │`);
  console.log(`  │ Affected orders:                ${String(result.affectedOrders).padStart(10)} │`);
  console.log(`  │ Affected stores:                ${String(result.affectedStores).padStart(10)} │`);
  console.log(`  │ Estimated cost to backfill:   $${String(Math.round(result.estimatedCostToBackfill)).padStart(9)} │`);
  console.log("  └─────────────────────────────────────────────┘");

  if (!dryRun) {
    console.log(`\n  ✅ Items updated:       ${result.itemsUpdated}`);
    console.log(`  ✅ Audit events created: ${result.eventsCreated}`);
  }

  // Detail table (first 20)
  if (result.details.length > 0) {
    console.log(`\n  Details (first ${Math.min(20, result.details.length)} of ${result.details.length}):\n`);
    console.log(
      "  " +
        ["Action", "Product", "Qty", "Price", "OldCost", "NewCost", "MarginAfter", "Reason"]
          .map((h, i) => h.padEnd([8, 30, 4, 8, 8, 8, 12, 30][i]))
          .join(" "),
    );
    console.log("  " + "─".repeat(108));

    for (const d of result.details.slice(0, 20)) {
      console.log(
        "  " +
          [
            d.action.padEnd(8),
            d.productTitle.slice(0, 29).padEnd(30),
            String(d.quantity).padEnd(4),
            `$${d.priceSnapshot}`.padEnd(8),
            `$${d.oldCostSnapshot}`.padEnd(8),
            `$${d.newCostSnapshot}`.padEnd(8),
            d.estimatedMarginAfter.padEnd(12),
            d.reason.slice(0, 29).padEnd(30),
          ].join(" "),
      );
    }
  }

  // JSON output to stdout for piping
  if (process.env.JSON_OUTPUT === "true") {
    console.log("\n--- JSON OUTPUT ---");
    console.log(JSON.stringify(result, null, 2));
  }

  console.log(`\n  Done. Exit code: 0\n`);
}

main()
  .catch((err) => {
    console.error("\n  ❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => process.exit(0)));
