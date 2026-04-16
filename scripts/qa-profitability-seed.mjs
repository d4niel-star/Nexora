// Seeds edge-case orders into the CLONED dev.qa.db, runs the engine, asserts each branch.
// This file NEVER touches the real dev.db.
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { randomUUID } from 'crypto';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.qa.db' });
const prisma = new PrismaClient({ adapter });

function computeRefundFactor(order) {
  const refund = order.refundAmount ?? 0;
  if (refund <= 0) return 1.0;
  if (order.total <= 0) return 1.0;
  if (refund >= order.total) return 0;
  return Math.max(0, 1 - refund / order.total);
}

async function runEngine(storeId) {
  const orders = await prisma.order.findMany({
    where: { storeId },
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

  for (const order of orders) {
    if (order.cancelledAt !== null) { exclusions.cancelled++; continue; }
    if (['pending', 'in_process'].includes(order.paymentStatus)) { exclusions.pending++; continue; }
    if (['rejected', 'failed', 'cancelled'].includes(order.paymentStatus)) { exclusions.failedOrRejected++; continue; }
    if (order.paymentStatus !== 'approved') { exclusions.fullyRefunded++; continue; }
    const rf = computeRefundFactor(order);
    if (rf === 0) { exclusions.fullyRefunded++; continue; }
    eligible.push({ order, refundFactor: rf, isPartialRefund: rf < 1 });
  }

  const productMap = new Map();
  let deletedProductRevenue = 0;
  let hasPartial = false;

  for (const { order, refundFactor, isPartialRefund } of eligible) {
    for (const item of order.items) {
      if (item.lineTotal <= 0 && item.quantity <= 0) continue;
      const eff = item.lineTotal * refundFactor;
      if (isPartialRefund) hasPartial = true;
      if (item.productId === null || item.product === null) {
        deletedProductRevenue += eff;
        continue;
      }
      const ex = productMap.get(item.productId);
      if (ex) {
        ex.revenue += eff;
        ex.unitsSold += item.quantity;
        ex.orderIds.add(order.id);
        if (isPartialRefund) ex.hasPartialRefunds = true;
      } else {
        productMap.set(item.productId, {
          product: item.product, revenue: eff,
          unitsSold: item.quantity, orderIds: new Set([order.id]),
          hasPartialRefunds: isPartialRefund,
        });
      }
    }
  }

  const products = [];
  for (const [productId, acc] of productMap) {
    const costPerUnit = acc.product.cost ?? null;
    const costKnown = costPerUnit !== null;
    const totalCost = costKnown ? costPerUnit * acc.unitsSold : null;
    const grossMargin = costKnown && acc.revenue > 0 ? acc.revenue - totalCost : null;
    const grossMarginPercent = grossMargin !== null && acc.revenue > 0 ? (grossMargin / acc.revenue) * 100 : null;
    let status;
    if (!costKnown) status = 'uncertain';
    else if (grossMargin !== null && grossMargin < 0) status = 'negative';
    else if (grossMarginPercent !== null && grossMarginPercent <= 15) status = 'warning';
    else status = 'profitable';
    products.push({
      productId, title: acc.product.title, revenue: acc.revenue,
      unitsSold: acc.unitsSold, costPerUnit, totalCost, grossMargin, grossMarginPercent, status,
      hasPartialRefunds: acc.hasPartialRefunds,
    });
  }

  return {
    products, exclusions, eligible: eligible.length,
    deletedProductRevenue, hasPartial,
    totalRevenue: products.reduce((s, p) => s + p.revenue, 0) + deletedProductRevenue,
  };
}

async function main() {
  const store = await prisma.store.findFirst({ where: { status: 'active' } });
  if (!store) throw new Error('No store');

  // ── Ensure we have a product WITH cost and a product WITHOUT cost ──
  const existingProducts = await prisma.product.findMany({ where: { storeId: store.id }, take: 10 });
  let productWithCost = existingProducts.find(p => p.cost !== null);
  let productNoCost = existingProducts.find(p => p.cost === null);

  if (productWithCost) {
    console.log(`[✓] Existing product WITH cost: "${productWithCost.title}" cost=$${productWithCost.cost}, price=$${productWithCost.price}`);
  }
  if (productNoCost) {
    console.log(`[✓] Existing product WITHOUT cost: "${productNoCost.title}" price=$${productNoCost.price}`);
  }

  // Guarantee cost is set on the "with cost" one (margin should be profitable)
  if (productWithCost) {
    // price 50% over cost → 33% margin → profitable
    const newCost = Math.round(productWithCost.price * 0.5);
    await prisma.product.update({ where: { id: productWithCost.id }, data: { cost: newCost } });
    console.log(`[seed] Set cost=${newCost} for ${productWithCost.title} (price ${productWithCost.price})`);
    productWithCost.cost = newCost;
  }

  // Create a NEGATIVE product (cost > price)
  const negativeProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      handle: 'qa-loss-leader-' + randomUUID().slice(0, 6),
      title: 'QA Loss Leader',
      status: 'published',
      price: 100,
      cost: 150, // cost > revenue → negative margin
      isPublished: true,
    },
  });
  console.log(`[seed] Created negative product: ${negativeProduct.title} (price=100, cost=150)`);

  // Create a WARNING product (margin ~10%)
  const warningProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      handle: 'qa-thin-margin-' + randomUUID().slice(0, 6),
      title: 'QA Thin Margin',
      status: 'published',
      price: 100,
      cost: 92, // 8% margin → warning
      isPublished: true,
    },
  });
  console.log(`[seed] Created warning product: ${warningProduct.title} (price=100, cost=92)`);

  // ── Seed orders exercising each branch ──
  const mk = (overrides) => ({
    storeId: store.id,
    orderNumber: 'QA-' + randomUUID().slice(0, 8),
    email: 'qa@test.com',
    firstName: 'QA',
    lastName: 'Test',
    addressLine1: 'QA 1',
    city: 'QA',
    province: 'QA',
    postalCode: '0000',
    country: 'AR',
    subtotal: 0,
    shippingAmount: 0,
    total: 0,
    currency: 'ARS',
    channel: 'Storefront',
    ...overrides,
  });

  const createdOrderIds = [];

  // Order 1: approved, profitable product, 2 units → profitable
  const o1 = await prisma.order.create({
    data: {
      ...mk({ paymentStatus: 'approved', subtotal: productWithCost.price * 2, total: productWithCost.price * 2 + 500, shippingAmount: 500 }),
      items: {
        create: [{
          productId: productWithCost.id,
          variantId: null,
          titleSnapshot: productWithCost.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: productWithCost.price,
          quantity: 2,
          lineTotal: productWithCost.price * 2,
        }],
      },
    },
  });
  createdOrderIds.push(o1.id);

  // Order 2: approved, negative product
  const o2 = await prisma.order.create({
    data: {
      ...mk({ paymentStatus: 'approved', subtotal: 100, total: 100 }),
      items: {
        create: [{
          productId: negativeProduct.id,
          variantId: null,
          titleSnapshot: negativeProduct.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: 100,
          quantity: 1,
          lineTotal: 100,
        }],
      },
    },
  });
  createdOrderIds.push(o2.id);

  // Order 3: approved, thin-margin product → warning
  const o3 = await prisma.order.create({
    data: {
      ...mk({ paymentStatus: 'approved', subtotal: 100, total: 100 }),
      items: {
        create: [{
          productId: warningProduct.id,
          variantId: null,
          titleSnapshot: warningProduct.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: 100,
          quantity: 1,
          lineTotal: 100,
        }],
      },
    },
  });
  createdOrderIds.push(o3.id);

  // Order 4: approved, product WITHOUT cost → uncertain
  if (productNoCost) {
    const o4 = await prisma.order.create({
      data: {
        ...mk({ paymentStatus: 'approved', subtotal: productNoCost.price, total: productNoCost.price }),
        items: {
          create: [{
            productId: productNoCost.id,
            variantId: null,
            titleSnapshot: productNoCost.title,
            variantTitleSnapshot: 'default',
            priceSnapshot: productNoCost.price,
            quantity: 1,
            lineTotal: productNoCost.price,
          }],
        },
      },
    });
    createdOrderIds.push(o4.id);
  }

  // Order 5: approved + PARTIAL refund (50%)
  const o5 = await prisma.order.create({
    data: {
      ...mk({
        paymentStatus: 'approved',
        subtotal: productWithCost.price,
        total: productWithCost.price,
        refundedAt: new Date(),
        refundAmount: productWithCost.price / 2,
      }),
      items: {
        create: [{
          productId: productWithCost.id,
          variantId: null,
          titleSnapshot: productWithCost.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: productWithCost.price,
          quantity: 1,
          lineTotal: productWithCost.price,
        }],
      },
    },
  });
  createdOrderIds.push(o5.id);

  // Order 6: approved + FULL refund (refundAmount >= total)
  const o6 = await prisma.order.create({
    data: {
      ...mk({
        paymentStatus: 'approved',
        subtotal: 999,
        total: 999,
        refundedAt: new Date(),
        refundAmount: 999,
      }),
      items: {
        create: [{
          productId: productWithCost.id,
          variantId: null,
          titleSnapshot: productWithCost.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: 999,
          quantity: 1,
          lineTotal: 999,
        }],
      },
    },
  });
  createdOrderIds.push(o6.id);

  // Order 7: cancelled
  const o7 = await prisma.order.create({
    data: {
      ...mk({
        paymentStatus: 'approved',
        subtotal: 500,
        total: 500,
        cancelledAt: new Date(),
        cancelReason: 'QA test',
      }),
      items: {
        create: [{
          productId: productWithCost.id,
          variantId: null,
          titleSnapshot: productWithCost.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: 500,
          quantity: 1,
          lineTotal: 500,
        }],
      },
    },
  });
  createdOrderIds.push(o7.id);

  // Order 8: rejected
  const o8 = await prisma.order.create({
    data: {
      ...mk({ paymentStatus: 'rejected', subtotal: 300, total: 300 }),
      items: {
        create: [{
          productId: productWithCost.id,
          variantId: null,
          titleSnapshot: productWithCost.title,
          variantTitleSnapshot: 'default',
          priceSnapshot: 300,
          quantity: 1,
          lineTotal: 300,
        }],
      },
    },
  });
  createdOrderIds.push(o8.id);

  // Order 9: approved + OrderItem with productId=null (deleted product)
  const o9 = await prisma.order.create({
    data: {
      ...mk({ paymentStatus: 'approved', subtotal: 777, total: 777 }),
      items: {
        create: [{
          productId: null,
          variantId: null,
          titleSnapshot: 'Deleted Ghost Product',
          variantTitleSnapshot: 'default',
          priceSnapshot: 777,
          quantity: 1,
          lineTotal: 777,
        }],
      },
    },
  });
  createdOrderIds.push(o9.id);

  console.log(`\n[seed] Created ${createdOrderIds.length} QA orders.\n`);

  // ── Run engine ──
  const report = await runEngine(store.id);

  console.log('═══ ENGINE REPORT (cloned DB) ═══');
  console.log(`Eligible orders:              ${report.eligible}`);
  console.log(`Exclusions:                   ${JSON.stringify(report.exclusions)}`);
  console.log(`Deleted product revenue:      $${report.deletedProductRevenue.toFixed(2)}`);
  console.log(`Has partial refunds:          ${report.hasPartial}`);
  console.log(`Total revenue:                $${report.totalRevenue.toFixed(2)}\n`);
  console.log('Product breakdown:');
  for (const p of report.products.sort((a, b) => b.revenue - a.revenue)) {
    const marginStr = p.grossMarginPercent !== null ? `${p.grossMarginPercent.toFixed(1)}%` : 'N/A';
    const partialFlag = p.hasPartialRefunds ? ' [partial-refund]' : '';
    console.log(`  ${p.status.padEnd(11)} | ${p.title.padEnd(30)} | rev=$${p.revenue.toFixed(2).padStart(8)} units=${p.unitsSold} margin=${marginStr}${partialFlag}`);
  }

  // ── Assertions ──
  console.log('\n═══ ASSERTIONS ═══');
  const assertions = [];
  const push = (name, ok, detail = '') => { assertions.push({ name, ok, detail }); };

  push('cancelled counted',      report.exclusions.cancelled >= 1);
  push('failedOrRejected counted', report.exclusions.failedOrRejected >= 1);
  push('fullyRefunded counted',  report.exclusions.fullyRefunded >= 1);
  push('pending counted',        report.exclusions.pending >= 3); // the 3 pre-existing pending orders
  push('deleted revenue bucketed', report.deletedProductRevenue === 777);
  push('partial refund flag set', report.hasPartial === true);

  const negProd = report.products.find(p => p.title === 'QA Loss Leader');
  push('negative product present', !!negProd, negProd ? `margin=${negProd.grossMarginPercent?.toFixed(1)}%` : '');
  push('negative product classified as negative', negProd?.status === 'negative');
  push('negative grossMargin is negative', (negProd?.grossMargin ?? 1) < 0);

  const warnProd = report.products.find(p => p.title === 'QA Thin Margin');
  push('warning product present', !!warnProd);
  push('warning product classified as warning', warnProd?.status === 'warning');

  const uncertainProd = report.products.find(p => p.status === 'uncertain');
  push('uncertain product present', !!uncertainProd);
  push('uncertain has null cost', uncertainProd?.totalCost === null);
  push('uncertain has null grossMargin', uncertainProd?.grossMargin === null);

  const profitableProd = report.products.find(p => p.title === productWithCost.title);
  push('profitable product present', !!profitableProd);
  push('profitable classified as profitable', profitableProd?.status === 'profitable');
  push('profitable partial-refund flag propagated', profitableProd?.hasPartialRefunds === true);

  let allOk = true;
  for (const a of assertions) {
    const mark = a.ok ? '✓' : '✗';
    if (!a.ok) allOk = false;
    console.log(`  ${mark} ${a.name}${a.detail ? ' — ' + a.detail : ''}`);
  }

  await prisma.$disconnect();
  if (!allOk) { console.error('\n✗ ASSERTIONS FAILED'); process.exit(1); }
  console.log('\n✓ ALL ASSERTIONS PASSED');
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
