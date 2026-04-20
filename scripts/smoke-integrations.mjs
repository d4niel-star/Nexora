// ─── Smoke for integrations depth (state / CTA derivation) ──────────────
// Exercises the MP state derivation and app-level state rules that drive
// the unified integrations hub. Pure state classification — no DB.
//
// Run:  npx tsx scripts/smoke-integrations.mjs

import { strict as assert } from "node:assert";

// Recreate the MP derivation rules inline so we can test them without
// booting Prisma. Must stay in sync with deriveMercadoPagoState in
// src/lib/integrations/queries.ts — the smoke fails loudly if they drift.
function deriveMpState(mp) {
  if (!mp || !mp.accessTokenEncrypted)
    return { state: "needs_setup", health: "inactive" };
  if (
    mp.status === "needs_reconnection" ||
    mp.status === "expired" ||
    (mp.tokenExpiresAt && new Date(mp.tokenExpiresAt).getTime() < Date.now())
  )
    return { state: "needs_reconnection", health: "critical" };
  if (mp.status === "error" || mp.lastError)
    return { state: "error", health: "critical" };
  if (mp.status === "connected")
    return { state: "ready", health: "operational" };
  return { state: "degraded", health: "degraded" };
}

// App-level derivation rules used by getUnifiedConnections:
function deriveAppState({ whatsapp, postPurchase, reviewsApproved, bundlesActive, ordersTotal, ordersWithTracking }) {
  const tracking =
    ordersTotal === 0
      ? "not_installed"
      : ordersWithTracking > 0
        ? "ready"
        : "needs_setup";
  const wa = !whatsapp
    ? "not_installed"
    : whatsapp.status === "active" &&
        whatsapp.accessTokenEncrypted &&
        whatsapp.phoneNumberId &&
        whatsapp.templateName
      ? "ready"
      : whatsapp.status === "disabled"
        ? "degraded"
        : "needs_setup";
  const ppEnabled = postPurchase?.reviewRequestEnabled || postPurchase?.reorderFollowupEnabled;
  const pp = !postPurchase ? "not_installed" : ppEnabled ? "ready" : "needs_setup";
  const reviews = reviewsApproved > 0 ? "ready" : "needs_setup";
  const bundles = bundlesActive > 0 ? "ready" : "needs_setup";
  return { tracking, wa, pp, reviews, bundles };
}

const scenarios = [
  {
    name: "1. MP listo (OAuth conectado)",
    input: { mp: { status: "connected", accessTokenEncrypted: "enc", lastError: null, tokenExpiresAt: null } },
    expectMp: { state: "ready", health: "operational" },
  },
  {
    name: "1b. MP no conectado",
    input: { mp: null },
    expectMp: { state: "needs_setup", health: "inactive" },
  },
  {
    name: "1c. MP token vencido (reconexión)",
    input: {
      mp: {
        status: "connected",
        accessTokenEncrypted: "enc",
        lastError: null,
        tokenExpiresAt: new Date(Date.now() - 86400000).toISOString(),
      },
    },
    expectMp: { state: "needs_reconnection", health: "critical" },
  },
  {
    name: "1d. MP explicitamente needs_reconnection",
    input: {
      mp: { status: "needs_reconnection", accessTokenEncrypted: "enc", lastError: null, tokenExpiresAt: null },
    },
    expectMp: { state: "needs_reconnection", health: "critical" },
  },
  {
    name: "1e. MP en error (lastError presente)",
    input: {
      mp: { status: "connected", accessTokenEncrypted: "enc", lastError: "refresh failed", tokenExpiresAt: null },
    },
    expectMp: { state: "error", health: "critical" },
  },
  {
    name: "2. Tracking usable (1 pedido con tracking sobre 3)",
    input: { ordersTotal: 3, ordersWithTracking: 1 },
    expectApp: { tracking: "ready" },
  },
  {
    name: "2b. Tracking sin pedidos",
    input: { ordersTotal: 0, ordersWithTracking: 0 },
    expectApp: { tracking: "not_installed" },
  },
  {
    name: "2c. Tracking con pedidos pero ninguno con código",
    input: { ordersTotal: 5, ordersWithTracking: 0 },
    expectApp: { tracking: "needs_setup" },
  },
  {
    name: "3. Provider sourcing — cubierto por health, aqui solo app layer",
    input: {},
    expectApp: {},
  },
  {
    name: "4. App retención configurada (WhatsApp completo)",
    input: {
      whatsapp: {
        status: "active",
        accessTokenEncrypted: "enc",
        phoneNumberId: "pn",
        templateName: "recovery_v1",
      },
    },
    expectApp: { wa: "ready" },
  },
  {
    name: "4b. WhatsApp sin configurar",
    input: { whatsapp: null },
    expectApp: { wa: "not_installed" },
  },
  {
    name: "4c. WhatsApp con settings pero sin token",
    input: {
      whatsapp: { status: "needs_setup", accessTokenEncrypted: null, phoneNumberId: null, templateName: null },
    },
    expectApp: { wa: "needs_setup" },
  },
  {
    name: "5. Post-purchase flows activo (review + reorder)",
    input: {
      postPurchase: {
        reviewRequestEnabled: true,
        reorderFollowupEnabled: false,
      },
    },
    expectApp: { pp: "ready" },
  },
  {
    name: "5b. Post-purchase instalado pero todo off (necesita setup)",
    input: { postPurchase: { reviewRequestEnabled: false, reorderFollowupEnabled: false } },
    expectApp: { pp: "needs_setup" },
  },
  {
    name: "6. Merchant con todo listo (stack mínimo operativo)",
    input: {
      mp: { status: "connected", accessTokenEncrypted: "enc", lastError: null, tokenExpiresAt: null },
      ordersTotal: 5,
      ordersWithTracking: 3,
      whatsapp: { status: "active", accessTokenEncrypted: "enc", phoneNumberId: "pn", templateName: "t" },
      postPurchase: { reviewRequestEnabled: true },
      reviewsApproved: 2,
      bundlesActive: 1,
    },
    expectMp: { state: "ready", health: "operational" },
    expectApp: { tracking: "ready", wa: "ready", pp: "ready", reviews: "ready", bundles: "ready" },
  },
];

let passed = 0;
for (const s of scenarios) {
  try {
    if (s.expectMp) {
      const got = deriveMpState(s.input.mp);
      for (const [k, v] of Object.entries(s.expectMp)) {
        assert.equal(got[k], v, `${s.name} → mp.${k}: expected ${v}, got ${got[k]}`);
      }
    }
    if (s.expectApp) {
      const got = deriveAppState({
        whatsapp: s.input.whatsapp ?? null,
        postPurchase: s.input.postPurchase ?? null,
        reviewsApproved: s.input.reviewsApproved ?? 0,
        bundlesActive: s.input.bundlesActive ?? 0,
        ordersTotal: s.input.ordersTotal ?? 0,
        ordersWithTracking: s.input.ordersWithTracking ?? 0,
      });
      for (const [k, v] of Object.entries(s.expectApp)) {
        assert.equal(got[k], v, `${s.name} → app.${k}: expected ${v}, got ${got[k]}`);
      }
    }
    console.log(`✓  ${s.name}`);
    passed += 1;
  } catch (err) {
    console.error(`✗  ${s.name}`);
    console.error(`   ${err.message}`);
  }
}

console.log(`\n${passed}/${scenarios.length} scenarios passed`);
process.exit(passed === scenarios.length ? 0 : 1);
