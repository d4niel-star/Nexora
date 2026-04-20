// ─── Smoke harness for the orders work-queue derivation ─────────────────
// Exercises deriveOrderNextAction against each of the six scenarios the
// daily-operations brief mandates. Offline — no Prisma, no HTTP.
//
// Run:  npx tsx scripts/smoke-workqueue.mjs

import { strict as assert } from "node:assert";

const { deriveOrderNextAction, orderNeedsAction } = await import(
  "../src/lib/orders/workqueue.ts"
);

function mkOrder(overrides) {
  return {
    id: overrides.id ?? "o1",
    number: "#10001",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    status: overrides.status ?? "new",
    paymentStatus: overrides.paymentStatus ?? "pending",
    channel: "Storefront",
    total: 10000,
    subtotal: 9500,
    shippingCost: 500,
    currency: "ARS",
    customer: { id: "c1", name: "Test", email: "test@example.com" },
    shipping: {
      address: "X",
      city: "CABA",
      state: "BA",
      zipCode: "1000",
      country: "AR",
      shippingStatus: overrides.shippingStatus ?? "unfulfilled",
      trackingNumber: overrides.trackingNumber ?? null,
    },
    items: [],
  };
}

const hours = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

const scenarios = [
  {
    name: "1. Merchant con pedidos nuevos (pago pendiente, fresco)",
    order: mkOrder({ paymentStatus: "pending", createdAt: hours(2) }),
    expect: null, // < 48h, no action yet — honest
  },
  {
    name: "1b. Nuevo pero cobro aprobado y nada de fulfillment",
    order: mkOrder({ status: "new", paymentStatus: "paid", shippingStatus: "unfulfilled" }),
    expect: { kind: "mark_preparing", urgent: false },
  },
  {
    name: "2. Fulfillment pendiente (pagado, sin movimiento)",
    order: mkOrder({ status: "paid", paymentStatus: "paid", shippingStatus: "unfulfilled" }),
    expect: { kind: "mark_preparing", urgent: false },
  },
  {
    name: "3. Tracking en curso (preparando, normal)",
    order: mkOrder({
      status: "processing",
      paymentStatus: "paid",
      shippingStatus: "preparing",
      createdAt: hours(4),
    }),
    expect: { kind: "mark_shipped", urgent: false },
  },
  {
    name: "3b. Preparación trabada (>36h preparando)",
    order: mkOrder({
      status: "processing",
      paymentStatus: "paid",
      shippingStatus: "preparing",
      createdAt: hours(40),
    }),
    expect: { kind: "preparation_stalled", urgent: true },
  },
  {
    name: "3c. Enviado sin tracking — hueco operativo",
    order: mkOrder({
      status: "shipped",
      paymentStatus: "paid",
      shippingStatus: "shipped",
      trackingNumber: null,
    }),
    expect: { kind: "add_tracking", urgent: false },
  },
  {
    name: "4. Cancelado — jamás requiere acción",
    order: mkOrder({ status: "cancelled", paymentStatus: "refunded" }),
    expect: null,
  },
  {
    name: "5. Cliente repetido con pedido entregado (sin acción)",
    order: mkOrder({
      status: "delivered",
      paymentStatus: "paid",
      shippingStatus: "delivered",
      trackingNumber: "ABC123",
    }),
    expect: null,
  },
  {
    name: "6. Pago trabado > 48h — urgente",
    order: mkOrder({
      status: "new",
      paymentStatus: "pending",
      createdAt: hours(60),
    }),
    expect: { kind: "payment_stalled", urgent: true },
  },
];

let passed = 0;
for (const s of scenarios) {
  const got = deriveOrderNextAction(s.order);
  try {
    if (s.expect === null) {
      assert.equal(got, null, `${s.name}: expected no action, got ${JSON.stringify(got)}`);
      assert.equal(orderNeedsAction(s.order), false, `${s.name}: orderNeedsAction must be false`);
    } else {
      assert.ok(got, `${s.name}: expected an action, got null`);
      assert.equal(got.kind, s.expect.kind, `${s.name}: kind mismatch (got ${got.kind})`);
      assert.equal(got.urgent, s.expect.urgent, `${s.name}: urgent mismatch`);
      assert.equal(orderNeedsAction(s.order), true, `${s.name}: orderNeedsAction must be true`);
    }
    console.log(`✓  ${s.name}  →  ${got ? `${got.kind}${got.urgent ? " (urgent)" : ""}` : "no action"}`);
    passed += 1;
  } catch (err) {
    console.error(`✗  ${s.name}`);
    console.error(`   ${err.message}`);
  }
}

console.log(`\n${passed}/${scenarios.length} scenarios passed`);
process.exit(passed === scenarios.length ? 0 : 1);
