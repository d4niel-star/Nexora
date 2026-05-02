// ─── QA Fixture: Create a shipping-type order for Phase 2F testing ──────
// Run with: npx tsx src/scripts/qa-create-shipping-order.ts

import { prisma } from "../lib/db/prisma";

async function main() {
  
  try {
    // Find the store
    const store = await prisma.store.findFirst({ select: { id: true, slug: true } });
    if (!store) { console.log("No store found"); return; }
    console.log(`Store: ${store.slug} (${store.id})`);

    // Find a product with variant for line items
    const variant = await prisma.productVariant.findFirst({
      where: { product: { storeId: store.id } },
      include: { product: true },
    });

    // Create a shipping method of type "shipping" if none exists
    let shippingMethod = await prisma.shippingMethod.findFirst({
      where: { storeId: store.id, type: "shipping" },
    });
    if (!shippingMethod) {
      shippingMethod = await prisma.shippingMethod.create({
        data: {
          storeId: store.id,
          code: "standard_shipping",
          name: "Envío estándar",
          type: "shipping",
          carrier: "correo_argentino",
          baseAmount: 2500,
          estimatedDaysMin: 3,
          estimatedDaysMax: 7,
          isActive: true,
        },
      });
      console.log(`Created shipping method: ${shippingMethod.id}`);
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        orderNumber: "10002",
        email: "qa-shipping@nexora.dev",
        firstName: "QA",
        lastName: "Shipping Test",
        phone: "+5491122334455",
        addressLine1: "Av. Corrientes 1234",
        addressLine2: "Piso 5 Depto B",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "1043",
        country: "AR",
        currency: "ARS",
        subtotal: 5000,
        shippingAmount: 2500,
        total: 7500,
        status: "paid",
        publicStatus: "PAID",
        paymentStatus: "paid",
        channel: "Storefront",
        shippingMethodId: shippingMethod.id,
        shippingMethodLabel: "Envío estándar",
        shippingCarrier: "correo_argentino",
        shippingEstimate: "3-7 días hábiles",
        shippingStatus: "unfulfilled",
      },
    });
    console.log(`Created shipping order: ${order.orderNumber} (${order.id})`);

    // Create line items if we have a variant
    if (variant) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          storeId: store.id,
          productId: variant.productId,
          variantId: variant.id,
          sku: variant.sku || "QA-SKU-001",
          title: variant.product.title,
          variantTitle: variant.title || "Default",
          quantity: 2,
          priceSnapshot: 2500,
          costSnapshot: 1200,
          lineTotal: 5000,
        },
      });
      console.log(`Created order item for ${variant.product.title}`);
    }

    // Create a payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "mercadopago",
        externalId: "qa-mp-shipping-001",
        status: "approved",
        amount: 7500,
        currency: "ARS",
        paymentMethod: "credit_card",
        paidAt: new Date(),
      },
    });
    console.log("Created payment record");

    // Log system event for order creation
    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "order",
        entityId: order.id,
        eventType: "order_created",
        severity: "info",
        source: "qa_fixture",
        message: `Orden QA shipping ${order.orderNumber} creada para Phase 2F`,
      },
    });
    console.log("Created system event");

    console.log("\n✅ QA shipping order created successfully!");
    console.log(`   Order: #${order.orderNumber}`);
    console.log(`   Status: ${order.status} / payment: ${order.paymentStatus}`);
    console.log(`   Shipping: ${order.shippingMethodLabel} (${order.shippingStatus})`);
    console.log(`   Navigate to: http://localhost:3000/admin/orders`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
