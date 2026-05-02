// ─── QA Order Timeline Fixture ──────────────────────────────────────────
//
// Creates a complete test order with associated records to verify the
// order timeline feature. DEV-ONLY — refuses to run in production.
//
// Usage:
//   npx tsx --env-file=.env.local --env-file=.env scripts/create-order-timeline-fixture.ts --dev-only
//
// Records created:
//   1. Order (status=paid, paymentStatus=approved)
//   2. OrderItem (linked to first product with stock)
//   3. Payment (status=approved)
//   4. SystemEvent (order_created + payment_approved)
//   5. StockMovement (type=sale)
//   6. EmailLog (ORDER_CREATED, sent)

import { prisma } from "../src/lib/db/prisma";

async function main() {
  // Safety: require --dev-only flag
  if (!process.argv.includes("--dev-only")) {
    console.error("❌ Must pass --dev-only flag to run this fixture script.");
    process.exit(1);
  }

  // Safety: refuse production
  if (process.env.NODE_ENV === "production") {
    console.error("❌ This script cannot run in production.");
    process.exit(1);
  }

  console.log("\n🧪 Creating QA Order Timeline Fixture...\n");

  // Find the main dev store
  const store = await prisma.store.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true },
  });

  if (!store) {
    console.error("❌ No active store found.");
    process.exit(1);
  }
  console.log(`  Store: ${store.name} (${store.slug})`);

  // Find or create a product with stock
  let product = await prisma.product.findFirst({
    where: { storeId: store.id, status: { not: "archived" } },
    include: { variants: { take: 1 } },
  });

  if (!product || product.variants.length === 0) {
    console.log("  Creating QA product...");
    product = await prisma.product.create({
      data: {
        storeId: store.id,
        handle: `qa-timeline-product-${Date.now()}`,
        title: "QA Timeline Test Product",
        price: 2500,
        cost: 1200,
        status: "active",
        isPublished: true,
        variants: {
          create: {
            title: "Default",
            price: 2500,
            stock: 100,
            isDefault: true,
          },
        },
      },
      include: { variants: { take: 1 } },
    });
  }

  const variant = product.variants[0];
  console.log(`  Product: ${product.title} (${product.id})`);
  console.log(`  Variant: ${variant.title} ($${variant.price}, stock: ${variant.stock})`);

  // Get next order number
  const lastOrder = await prisma.order.findFirst({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });
  const nextNum = lastOrder ? parseInt(lastOrder.orderNumber, 10) + 1 : 10001;
  const orderNumber = String(nextNum);

  // Create Order
  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      orderNumber,
      email: "qa-timeline@nexora.dev",
      firstName: "QA",
      lastName: "Timeline Test",
      phone: "+5491155551234",
      addressLine1: "Av. Corrientes 1234",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "1043",
      country: "AR",
      currency: "ARS",
      subtotal: 2500,
      shippingAmount: 0,
      total: 2500,
      status: "paid",
      paymentStatus: "approved",
      channel: "Storefront",
      paymentProvider: "mercadopago",
      shippingMethodLabel: "Retiro en local (QA)",
      items: {
        create: {
          productId: product.id,
          variantId: variant.id,
          titleSnapshot: product.title,
          variantTitleSnapshot: variant.title,
          priceSnapshot: variant.price,
          costSnapshot: product.cost ?? 0,
          quantity: 1,
          lineTotal: variant.price,
        },
      },
    },
  });

  console.log(`  Order: #${orderNumber} (${order.id})`);

  // Update StoreOrderSequence so real checkout doesn't conflict
  await prisma.storeOrderSequence.upsert({
    where: { storeId: store.id },
    update: { nextValue: nextNum + 1 },
    create: { storeId: store.id, nextValue: nextNum + 1 },
  });

  // Create Payment
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "mercadopago",
      status: "approved",
      amount: 2500,
      currency: "ARS",
      paymentMethod: "credit_card",
      paymentType: "visa",
      installments: 1,
      externalId: `QA-MP-${Date.now()}`,
      paidAt: new Date(),
    },
  });
  console.log(`  Payment: ${payment.id} (approved)`);

  // Create SystemEvents
  const seCreated = await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "order",
      entityId: order.id,
      eventType: "order_created",
      severity: "info",
      source: "qa_fixture",
      message: `Orden #${orderNumber} creada desde fixture QA`,
      metadataJson: JSON.stringify({
        channel: "Storefront",
        total: 2500,
        source: "qa_timeline_fixture",
      }),
    },
  });

  const sePayment = await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "order",
      entityId: order.id,
      eventType: "payment_approved",
      severity: "info",
      source: "qa_fixture",
      message: `Pago aprobado por Mercado Pago (QA)`,
      metadataJson: JSON.stringify({
        provider: "mercadopago",
        amount: 2500,
        paymentMethod: "credit_card",
        source: "qa_timeline_fixture",
      }),
      createdAt: new Date(Date.now() + 2000), // 2s after order
    },
  });

  const seStock = await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "order",
      entityId: order.id,
      eventType: "stock_decremented",
      severity: "info",
      source: "qa_fixture",
      message: `Stock online descontado: ${product.title} (-1)`,
      metadataJson: JSON.stringify({
        productId: product.id,
        variantId: variant.id,
        quantityDelta: -1,
        source: "qa_timeline_fixture",
      }),
      createdAt: new Date(Date.now() + 3000), // 3s after order
    },
  });

  console.log(`  SystemEvents: ${[seCreated.id, sePayment.id, seStock.id].join(", ")}`);

  // Create StockMovement
  const stockMov = await prisma.stockMovement.create({
    data: {
      storeId: store.id,
      productId: product.id,
      variantId: variant.id,
      orderId: order.id,
      type: "sale",
      quantityDelta: -1,
      reason: "Venta online (QA timeline fixture)",
      metadataJson: JSON.stringify({ orderNumber, source: "qa_fixture" }),
    },
  });
  console.log(`  StockMovement: ${stockMov.id}`);

  // Create EmailLog
  const emailLog = await prisma.emailLog.create({
    data: {
      storeId: store.id,
      eventType: "ORDER_CREATED",
      entityType: "order",
      entityId: order.id,
      recipient: "qa-timeline@nexora.dev",
      status: "sent",
      provider: "mock",
      sentAt: new Date(Date.now() + 5000), // 5s after order
    },
  });
  console.log(`  EmailLog: ${emailLog.id}`);

  console.log("\n✅ Fixture created successfully!");
  console.log(`\n  → Open /admin/orders and click on order #${orderNumber} to see the timeline.\n`);
}

main()
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => process.exit(0)));
