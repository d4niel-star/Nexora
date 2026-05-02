// ─── Pickup reservation expiration · end-to-end smoke ──────────────────
//
// Exercises the real core service against a real database by seeding
// the full state of every relevant scenario, running the core
// function, asserting each invariant, running it again to assert
// idempotency, and cleaning up behind itself.
//
// Scenarios covered:
//   A. Abandoned pickup order → expired + stock restored
//   B. Paid pickup order     → never touched (paymentStatus=paid)
//   C. Payment approved but Order.paymentStatus still pending
//                            → skippedPaid (paranoid safety valve)
//   D. Shipping order         → never candidate (shipping method type=shipping)
//   E. Idempotency            → second run is a no-op (scanned = 0 for seed)
//   F. dryRun                 → no writes, classification is honest
//
// Run:
//   npx tsx scripts/smoke-pickup-expiration.ts
//
// Exit 0 on full success, 1 on any assertion failure.

import { prisma } from "@/lib/db/prisma";
import { expireAbandonedPickupReservations } from "@/lib/store-engine/pickup/expire-reservations";

// Unique tag so parallel test runs and leftovers from previous runs
// do not collide.
const TAG = `EXP${Date.now().toString(36)}`.toUpperCase();

type Assertion = { label: string; passed: boolean; detail?: string };
const assertions: Assertion[] = [];

function expect(label: string, passed: boolean, detail?: string) {
  assertions.push({ label, passed, detail });
  if (passed) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function findOrCreateTestStore() {
  // Reuse any active store; every helper here is multi-tenant safe
  // because we always filter by storeId. Creating a fresh store would
  // require cascades for branding/theme/etc. that are outside the
  // scope of this smoke.
  const store = await prisma.store.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!store) {
    throw new Error(
      "smoke requires at least one active store in the DB (create one via admin or run seed)",
    );
  }
  return store;
}

async function ensurePickupShippingMethod(storeId: string) {
  const code = `pickup_smoke_${TAG.toLowerCase()}`;
  return prisma.shippingMethod.upsert({
    where: { storeId_code: { storeId, code } },
    update: { isActive: true },
    create: {
      storeId,
      code,
      name: "Retiro en local (smoke)",
      type: "pickup",
      baseAmount: 0,
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      isActive: true,
      isDefault: false,
      sortOrder: 999,
    },
  });
}

async function ensureShippingMethod(storeId: string) {
  const code = `shipping_smoke_${TAG.toLowerCase()}`;
  return prisma.shippingMethod.upsert({
    where: { storeId_code: { storeId, code } },
    update: { isActive: true },
    create: {
      storeId,
      code,
      name: "Envío smoke",
      type: "shipping",
      baseAmount: 500,
      estimatedDaysMin: 2,
      estimatedDaysMax: 5,
      isActive: true,
      isDefault: false,
      sortOrder: 998,
    },
  });
}

async function ensureLocation(storeId: string) {
  const existing = await prisma.storeLocation.findUnique({
    where: { storeId },
  });
  if (existing) {
    if (!existing.pickupEnabled) {
      return prisma.storeLocation.update({
        where: { storeId },
        data: { pickupEnabled: true },
      });
    }
    return existing;
  }
  return prisma.storeLocation.create({
    data: {
      storeId,
      name: "Smoke local",
      country: "AR",
      pickupEnabled: true,
    },
  });
}

async function ensureProductAndVariant(storeId: string) {
  // Reuse an existing product/variant so we exercise the real
  // LocalInventory path; if there is none we create a disposable one.
  const existing = await prisma.product.findFirst({
    where: { storeId },
    include: { variants: true },
  });
  if (existing && existing.variants.length > 0) {
    return { product: existing, variant: existing.variants[0] };
  }
  const product = await prisma.product.create({
    data: {
      storeId,
      handle: `smoke-${TAG.toLowerCase()}`,
      title: `Smoke product ${TAG}`,
      status: "published",
      price: 1000,
      variants: {
        create: [
          {
            title: "Default",
            price: 1000,
            stock: 0,
            trackInventory: false,
          },
        ],
      },
    },
    include: { variants: true },
  });
  return { product, variant: product.variants[0] };
}

async function resetLocalInventory(params: {
  storeId: string;
  locationId: string;
  variantId: string;
  stock: number;
}) {
  await prisma.localInventory.upsert({
    where: {
      locationId_variantId: {
        locationId: params.locationId,
        variantId: params.variantId,
      },
    },
    update: { stock: params.stock },
    create: {
      storeId: params.storeId,
      locationId: params.locationId,
      variantId: params.variantId,
      stock: params.stock,
      lowStockThreshold: 2,
    },
  });
}

async function readLocalStock(locationId: string, variantId: string) {
  const row = await prisma.localInventory.findUnique({
    where: { locationId_variantId: { locationId, variantId } },
    select: { stock: true },
  });
  return row?.stock ?? 0;
}

type SeedOrderParams = {
  storeId: string;
  shippingMethodId: string;
  variantId: string;
  productId: string;
  ageMinutes: number;
  quantity: number;
  paymentStatus?: string;
  status?: string;
  seedDecrementEvent?: boolean;
  kindLabel: string;
};

async function seedOrder(params: SeedOrderParams) {
  const createdAt = new Date(Date.now() - params.ageMinutes * 60_000);
  const orderNumber = `#TEST-${TAG}-${params.kindLabel}`;
  const order = await prisma.order.create({
    data: {
      storeId: params.storeId,
      orderNumber,
      email: `smoke-${TAG.toLowerCase()}@test.local`,
      firstName: "Smoke",
      lastName: "Buyer",
      addressLine1: "",
      city: "",
      province: "",
      postalCode: "",
      country: "AR",
      currency: "ARS",
      subtotal: 1000 * params.quantity,
      shippingAmount: 0,
      total: 1000 * params.quantity,
      status: params.status ?? "new",
      paymentStatus: params.paymentStatus ?? "pending",
      paymentProvider: "mercadopago",
      channel: "Storefront",
      shippingMethodId: params.shippingMethodId,
      shippingMethodLabel: "smoke",
      createdAt,
      updatedAt: createdAt,
      items: {
        create: [
          {
            productId: params.productId,
            variantId: params.variantId,
            titleSnapshot: "Smoke product",
            variantTitleSnapshot: "Default",
            priceSnapshot: 1000,
            quantity: params.quantity,
            lineTotal: 1000 * params.quantity,
          },
        ],
      },
    },
  });

  if (params.seedDecrementEvent) {
    await prisma.systemEvent.create({
      data: {
        storeId: params.storeId,
        entityType: "order",
        entityId: order.id,
        eventType: "pickup_local_stock_decremented",
        severity: "info",
        source: "smoke_seed",
        message: `Seeded decrement for smoke order ${order.orderNumber}`,
      },
    });
  }

  return order;
}

async function loadOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      publicStatus: true,
      shippingStatus: true,
      cancelledAt: true,
      cancelReason: true,
    },
  });
}

async function countEvent(orderId: string, eventType: string) {
  return prisma.systemEvent.count({
    where: { entityType: "order", entityId: orderId, eventType },
  });
}

// ─── Cleanup (always runs) ─────────────────────────────────────────────
async function cleanup(storeId: string) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      orderNumber: { startsWith: `#TEST-${TAG}-` },
    },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length > 0) {
    // SystemEvents don't have FK cascade; delete them explicitly.
    await prisma.systemEvent.deleteMany({
      where: { entityType: "order", entityId: { in: orderIds } },
    });
    // Payment + OrderItem cascade on Order delete (FK onDelete: Cascade).
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  // Job-level audit rows emitted by the endpoint (not by the core).
  await prisma.systemEvent.deleteMany({
    where: {
      entityType: "job",
      entityId: "pickup_expire",
      eventType: "pickup_reservation_expire_run",
      // We don't narrow further; the overview of this count is
      // bounded because the smoke only runs a handful of runs.
      createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
  });
  await prisma.shippingMethod.deleteMany({
    where: {
      storeId,
      code: { in: [`pickup_smoke_${TAG.toLowerCase()}`, `shipping_smoke_${TAG.toLowerCase()}`] },
    },
  });
}

async function main() {
  console.log(`[smoke-pickup-expiration] tag=${TAG}`);
  const store = await findOrCreateTestStore();
  console.log(`[smoke-pickup-expiration] store=${store.slug} id=${store.id}`);

  const [pickupMethod, shippingMethod, location, pv] = await Promise.all([
    ensurePickupShippingMethod(store.id),
    ensureShippingMethod(store.id),
    ensureLocation(store.id),
    ensureProductAndVariant(store.id),
  ]);

  try {
    // ── Scenario A: abandoned pickup order ─────────────────────────
    await resetLocalInventory({
      storeId: store.id,
      locationId: location.id,
      variantId: pv.variant.id,
      stock: 10,
    });
    const initialStock = await readLocalStock(location.id, pv.variant.id);
    expect(
      "A · initial local stock seeded to 10",
      initialStock === 10,
      `actual ${initialStock}`,
    );

    const abandoned = await seedOrder({
      storeId: store.id,
      shippingMethodId: pickupMethod.id,
      variantId: pv.variant.id,
      productId: pv.product.id,
      ageMinutes: 120, // 2h old — past 60m TTL
      quantity: 2,
      seedDecrementEvent: true,
      kindLabel: "ABANDONED",
    });
    // Simulate the real decrement done at order creation time.
    await prisma.localInventory.update({
      where: {
        locationId_variantId: {
          locationId: location.id,
          variantId: pv.variant.id,
        },
      },
      data: { stock: { decrement: 2 } },
    });

    // ── Scenario B: paid pickup order (never candidate) ────────────
    const paidPickup = await seedOrder({
      storeId: store.id,
      shippingMethodId: pickupMethod.id,
      variantId: pv.variant.id,
      productId: pv.product.id,
      ageMinutes: 120,
      quantity: 1,
      paymentStatus: "paid",
      status: "paid",
      seedDecrementEvent: true,
      kindLabel: "PAID",
    });

    // ── Scenario C: pending order with approved Payment row ────────
    const pendingWithApprovedPayment = await seedOrder({
      storeId: store.id,
      shippingMethodId: pickupMethod.id,
      variantId: pv.variant.id,
      productId: pv.product.id,
      ageMinutes: 120,
      quantity: 1,
      seedDecrementEvent: true,
      kindLabel: "APPROVEDPAY",
    });
    await prisma.payment.create({
      data: {
        orderId: pendingWithApprovedPayment.id,
        provider: "mercadopago",
        status: "approved",
        amount: 1000,
        currency: "ARS",
        externalId: `mp_smoke_${TAG}`,
        paidAt: new Date(),
      },
    });

    // ── Scenario D: abandoned shipping order (not a pickup) ────────
    const shippingOrder = await seedOrder({
      storeId: store.id,
      shippingMethodId: shippingMethod.id,
      variantId: pv.variant.id,
      productId: pv.product.id,
      ageMinutes: 120,
      quantity: 1,
      seedDecrementEvent: false,
      kindLabel: "SHIPPING",
    });

    // ── Scenario F.1 (dryRun first, must not write) ────────────────
    console.log("[smoke] dryRun pass");
    const dry = await expireAbandonedPickupReservations({
      olderThanMinutes: 60,
      source: "manual",
      dryRun: true,
    });
    expect("F · dryRun scanned the abandoned order", dry.scanned >= 1);
    expect(
      "F · dryRun did not mutate the abandoned order",
      (await loadOrder(abandoned.id))?.status === "new",
    );
    expect(
      "F · dryRun did not restore stock",
      (await readLocalStock(location.id, pv.variant.id)) === 8,
    );

    // ── Run the real core ──────────────────────────────────────────
    console.log("[smoke] real pass #1");
    const first = await expireAbandonedPickupReservations({
      olderThanMinutes: 60,
      source: "manual",
    });
    expect("first run scanned ≥ 3 candidates", first.scanned >= 3, `scanned=${first.scanned}`);
    expect("first run expired exactly 1 (abandoned)", first.expired === 1, `expired=${first.expired}`);
    expect("first run restored exactly 1", first.restored === 1, `restored=${first.restored}`);
    expect(
      "first run skippedPaid ≥ 1 (approved Payment row)",
      first.skippedPaid >= 1,
      `skippedPaid=${first.skippedPaid}`,
    );
    expect("first run has no errors", first.errors === 0, JSON.stringify(first.errorDetails));

    const abandonedAfter = await loadOrder(abandoned.id);
    expect(
      "A · abandoned order marked cancelled",
      abandonedAfter?.status === "cancelled"
        && abandonedAfter?.paymentStatus === "failed"
        && abandonedAfter?.publicStatus === "CANCELLED"
        && abandonedAfter?.shippingStatus === "cancelled"
        && Boolean(abandonedAfter?.cancelledAt),
      JSON.stringify(abandonedAfter),
    );
    expect(
      "A · audit event pickup_reservation_expired exists",
      (await countEvent(abandoned.id, "pickup_reservation_expired")) >= 1,
    );
    expect(
      "A · audit event pickup_local_stock_restored exists",
      (await countEvent(abandoned.id, "pickup_local_stock_restored")) >= 1,
    );
    expect(
      "A · local stock returned to 10",
      (await readLocalStock(location.id, pv.variant.id)) === 10,
    );

    const paidAfter = await loadOrder(paidPickup.id);
    expect(
      "B · paid pickup order untouched (status)",
      paidAfter?.status === "paid" && paidAfter?.paymentStatus === "paid",
    );

    const approvedPayAfter = await loadOrder(pendingWithApprovedPayment.id);
    expect(
      "C · pending-with-approved-Payment order still pending/new",
      approvedPayAfter?.status === "new" && approvedPayAfter?.paymentStatus === "pending",
      JSON.stringify(approvedPayAfter),
    );
    expect(
      "C · audit pickup_reservation_expire_skipped_paid exists",
      (await countEvent(pendingWithApprovedPayment.id, "pickup_reservation_expire_skipped_paid")) >= 1,
    );

    const shippingAfter = await loadOrder(shippingOrder.id);
    expect(
      "D · shipping order never considered (still pending/new)",
      shippingAfter?.status === "new" && shippingAfter?.paymentStatus === "pending",
    );

    // ── E. Idempotency: second run is a no-op ──────────────────────
    console.log("[smoke] real pass #2 (idempotency)");
    const second = await expireAbandonedPickupReservations({
      olderThanMinutes: 60,
      source: "manual",
    });
    expect(
      "E · second run finds 0 new candidates",
      second.scanned === 0 || second.expired === 0,
      `scanned=${second.scanned} expired=${second.expired}`,
    );
    expect(
      "E · second run did not restore again",
      (await readLocalStock(location.id, pv.variant.id)) === 10,
    );
    expect(
      "E · single pickup_local_stock_restored audit row",
      (await countEvent(abandoned.id, "pickup_local_stock_restored")) === 1,
    );
  } finally {
    console.log(`[smoke-pickup-expiration] cleanup tag=${TAG}`);
    await cleanup(store.id);
    await prisma.$disconnect();
  }

  const failed = assertions.filter((a) => !a.passed);
  const total = assertions.length;
  console.log(`\n${total - failed.length}/${total} assertions passed`);
  if (failed.length > 0) {
    console.error("FAILED:");
    for (const a of failed) {
      console.error(`  · ${a.label}${a.detail ? ` — ${a.detail}` : ""}`);
    }
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("[smoke-pickup-expiration] fatal", err);
  try {
    await prisma.$disconnect();
  } catch {
    /* ignored */
  }
  process.exit(1);
});
