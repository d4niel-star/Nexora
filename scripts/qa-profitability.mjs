// QA script for Profitability Engine v1 — runs the real server action against the real DB.
// This is a one-shot validation tool, not shipped code.
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

function computeRefundFactor(order) {
  const refund = order.refundAmount ?? 0;
  if (refund <= 0) return 1.0;
  if (order.total <= 0) return 1.0;
  if (refund >= order.total) return 0;
  return Math.max(0, 1 - refund / order.total);
}

async function main() {
  console.log('═══ QA: Profitability Engine v1 ═══\n');

  // ── 1. DB state ──
  const store = await prisma.store.findFirst({ where: { status: 'active' } });
  console.log('Active store:', store ? `${store.slug} (${store.id})` : 'NONE');

  if (!store) {
    console.log('→ Engine would return emptyReport() — no active store');
    await prisma.$disconnect();
    return;
  }

  // ── 2. Raw DB breakdown ──
  const totalOrders = await prisma.order.count({ where: { storeId: store.id } });
  console.log(`\nTotal orders in DB: ${totalOrders}`);

  if (totalOrders === 0) {
    console.log('→ Engine would return empty report with zero exclusions — empty state triggered');
  } else {
    const byPayment = await prisma.order.groupBy({
      by: ['paymentStatus'],
      where: { storeId: store.id },
      _count: true,
    });
    console.log('Orders by paymentStatus:', byPayment);

    const cancelled = await prisma.order.count({
      where: { storeId: store.id, cancelledAt: { not: null } },
    });
    const refundedAny = await prisma.order.count({
      where: { storeId: store.id, refundedAt: { not: null } },
    });
    console.log(`Cancelled (cancelledAt != null): ${cancelled}`);
    console.log(`Any refund (refundedAt != null): ${refundedAny}`);
  }

  const productsTotal = await prisma.product.count({ where: { storeId: store.id } });
  const productsWithCost = await prisma.product.count({
    where: { storeId: store.id, cost: { not: null } },
  });
  console.log(`\nProducts: ${productsTotal} total, ${productsWithCost} with cost, ${productsTotal - productsWithCost} without cost`);

  // ── 3. Run the engine logic (copy of actions.ts calculation) ──
  console.log('\n── Running engine ──');
  const allOrders = await prisma.order.findMany({
    where: { storeId: store.id },
    select: {
      id: true, paymentStatus: true, cancelledAt: true, refundedAt: true,
      refundAmount: true, total: true, subtotal: true,
      items: {
        select: {
          id: true, productId: true, quantity: true, lineTotal: true,
          product: { select: { id: true, title: true, handle: true, category: true, cost: true } },
        },
      },
    },
  });

  const exclusions = { pending: 0, cancelled: 0, failedOrRejected: 0, fullyRefunded: 0 };
  const eligible = [];

  for (const order of allOrders) {
    if (order.cancelledAt !== null) { exclusions.cancelled++; continue; }
    if (['pending', 'in_process'].includes(order.paymentStatus)) { exclusions.pending++; continue; }
    if (['rejected', 'failed', 'cancelled'].includes(order.paymentStatus)) { exclusions.failedOrRejected++; continue; }
    if (order.paymentStatus !== 'approved') { exclusions.fullyRefunded++; continue; }
    const rf = computeRefundFactor(order);
    if (rf === 0) { exclusions.fullyRefunded++; continue; }
    eligible.push({ order, refundFactor: rf, isPartialRefund: rf < 1 });
  }

  console.log('Exclusions:', exclusions);
  console.log(`Eligible orders: ${eligible.length}`);
  console.log(`Partial-refund orders: ${eligible.filter(e => e.isPartialRefund).length}`);

  const productMap = new Map();
  let deletedProductRevenue = 0;

  for (const { order, refundFactor } of eligible) {
    for (const item of order.items) {
      if (item.lineTotal <= 0 && item.quantity <= 0) continue;
      const effectiveRevenue = item.lineTotal * refundFactor;
      if (item.productId === null || item.product === null) {
        deletedProductRevenue += effectiveRevenue;
        continue;
      }
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.revenue += effectiveRevenue;
        existing.unitsSold += item.quantity;
        existing.orderIds.add(order.id);
      } else {
        productMap.set(item.productId, {
          product: item.product, revenue: effectiveRevenue,
          unitsSold: item.quantity, orderIds: new Set([order.id]),
        });
      }
    }
  }

  console.log(`\nProducts with eligible revenue: ${productMap.size}`);
  console.log(`Deleted product revenue: $${deletedProductRevenue.toFixed(2)}`);

  let knownCostRevenue = 0, totalKnownCost = 0, totalGrossMargin = 0;
  let productsWithoutCost = 0, productsNegative = 0, productsWarning = 0, productsProfitable = 0;

  for (const [, acc] of productMap) {
    const costPerUnit = acc.product.cost ?? null;
    if (costPerUnit === null) {
      productsWithoutCost++;
      continue;
    }
    const totalCost = costPerUnit * acc.unitsSold;
    const grossMargin = acc.revenue - totalCost;
    const grossMarginPct = acc.revenue > 0 ? (grossMargin / acc.revenue) * 100 : null;
    knownCostRevenue += acc.revenue;
    totalKnownCost += totalCost;
    totalGrossMargin += grossMargin;
    if (grossMargin < 0) productsNegative++;
    else if (grossMarginPct !== null && grossMarginPct <= 15) productsWarning++;
    else productsProfitable++;
  }

  const totalGrossMarginPct = knownCostRevenue > 0 ? (totalGrossMargin / knownCostRevenue) * 100 : null;

  console.log('\n── Final report ──');
  console.log(`  Products uncertain (no cost): ${productsWithoutCost}`);
  console.log(`  Products negative:            ${productsNegative}`);
  console.log(`  Products warning (<= 15%):    ${productsWarning}`);
  console.log(`  Products profitable:          ${productsProfitable}`);
  console.log(`  knownCostRevenue:             $${knownCostRevenue.toFixed(2)}`);
  console.log(`  totalKnownCost:               $${totalKnownCost.toFixed(2)}`);
  console.log(`  totalGrossMargin:             $${totalGrossMargin.toFixed(2)}`);
  console.log(`  totalGrossMarginPercent:      ${totalGrossMarginPct !== null ? totalGrossMarginPct.toFixed(2) + '%' : 'null'}`);

  await prisma.$disconnect();
  console.log('\n✓ QA run complete');
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
