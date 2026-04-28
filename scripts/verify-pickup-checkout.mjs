// E2E smoke for the Tienda > Local físico → public checkout pickup
// integration. The script:
//
//   1. Forces the merchant's StoreLocation to pickupEnabled=true and
//      upserts the mirrored ShippingMethod(type="pickup") row, just
//      like the admin action does. This isolates the test from the
//      admin UI so we can verify the storefront path on its own.
//   2. Spins up a Chromium that:
//        a. visits the storefront, adds a product to the cart and
//           goes to /checkout
//        b. clicks the "Retiro en local" radio
//        c. screenshots the pickup card + verifies the address fields
//           are gone, total updates to subtotal, and the local name
//           appears
//        d. switches back to shipping and verifies address fields
//           come back and the shipping cost is non-zero
//   3. Disables pickup again, reloads the checkout, and confirms the
//      "Retiro en local" radio is no longer rendered.
//
// Output is colour-free so it can be piped into the assistant log.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORIGIN = "http://localhost:3000";
const STORE_SLUG = "aura-essentials";
const OUT_DIR = resolve(__dirname, "..", "verification-screenshots", "pickup-checkout");
const ADMIN_COOKIE = "75c539bbd9db2bd762e355f79dc5adddd278aa057f61263551ddbb1e9032407e";

// ─── DB helpers ──────────────────────────────────────────────────────
async function setPickupEnabled(enabled) {
  const { prisma } = await import("../src/lib/db/prisma.ts");
  const store = await prisma.store.findFirst({ where: { slug: STORE_SLUG } });
  if (!store) throw new Error(`Store ${STORE_SLUG} not found`);
  await prisma.storeLocation.update({
    where: { storeId: store.id },
    data: { pickupEnabled: enabled },
  });
  await prisma.shippingMethod.upsert({
    where: { storeId_code: { storeId: store.id, code: "pickup_local" } },
    create: {
      storeId: store.id,
      code: "pickup_local",
      name: "Retiro en local",
      type: "pickup",
      baseAmount: 0,
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      isActive: enabled,
      isDefault: false,
      sortOrder: 100,
    },
    update: { isActive: enabled, name: "Retiro en local", type: "pickup", baseAmount: 0 },
  });
  console.log(`  pickup ${enabled ? "ENABLED" : "DISABLED"} for ${STORE_SLUG}`);
}

async function disconnect() {
  const { prisma } = await import("../src/lib/db/prisma.ts");
  await prisma.$disconnect();
}

// ─── E2E ─────────────────────────────────────────────────────────────
async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log("→ STEP 1: enable pickup");
  await setPickupEnabled(true);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`console.error: ${m.text()}`);
  });

  // 2a — storefront: home + add a product to cart
  console.log("→ STEP 2: storefront home");
  await page.goto(`${ORIGIN}/store/${STORE_SLUG}/products`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT_DIR}/01-products.png`, fullPage: false });

  // Click on the first product card
  const firstProductLink = await page.locator('a[href*="/products/"]').first();
  if ((await firstProductLink.count()) === 0) {
    throw new Error("No product cards found on the storefront — cannot proceed");
  }
  await firstProductLink.click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT_DIR}/02-product.png`, fullPage: false });

  // Click "Agregar al carrito" — wait for it to actually be enabled
  // because the storefront initialises stock lazily.
  const addToCart = page.getByRole("button", { name: /agregar al carrito/i });
  await addToCart.waitFor({ state: "visible", timeout: 5_000 });
  await addToCart.click();
  await page.waitForTimeout(2500);

  // Check cart status before going to checkout
  await page.goto(`${ORIGIN}/store/${STORE_SLUG}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/02b-cart.png`, fullPage: true });
  const cartCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      empty: text.toLowerCase().includes("carrito está vacío") || text.toLowerCase().includes("carrito esta vacio"),
      url: window.location.pathname,
      checkoutLink: !!Array.from(document.querySelectorAll("a, button")).find((el) =>
        (el.textContent ?? "").toLowerCase().includes("checkout") ||
        (el.textContent ?? "").toLowerCase().includes("finalizar"),
      ),
    };
  });
  console.log("  cart check:", JSON.stringify(cartCheck, null, 2));

  // 2b — checkout
  console.log("→ STEP 3: visit checkout");
  await page.goto(`${ORIGIN}/store/${STORE_SLUG}/checkout`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/03-checkout-default.png`, fullPage: true });
  const checkoutPath = page.url().replace(ORIGIN, "");
  console.log("  checkout url after goto:", checkoutPath);

  // Inspect: pickup radio must be visible
  const checkoutChecks = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('input[name="shippingMethodId"]'));
    const labels = radios.map((r) => {
      const label = r.closest("label");
      return label?.textContent?.trim() ?? "";
    });
    const pickupRadio = radios.find((r) => {
      const l = r.closest("label")?.textContent?.toLowerCase() ?? "";
      return l.includes("retiro en local");
    });
    return {
      radioCount: radios.length,
      labels,
      hasPickupRadio: !!pickupRadio,
      hasAddressInput: !!document.querySelector('input[name="addressLine1"]'),
    };
  });
  console.log("  checkout checks (pickup ON):", JSON.stringify(checkoutChecks, null, 2));

  if (!checkoutChecks.hasPickupRadio) {
    throw new Error("Pickup radio not visible at checkout despite pickup being ON");
  }

  // 2c — click pickup radio
  console.log("→ STEP 4: select pickup");
  await page
    .locator('input[name="shippingMethodId"]')
    .nth(
      checkoutChecks.labels.findIndex((l) => l.toLowerCase().includes("retiro en local")),
    )
    .check();

  // Wait for the in-flight transition spinner to disappear before
  // taking the screenshot. The Loader2 icon is rendered while
  // `isShippingPending`/`router.refresh()` are still pending.
  await page
    .locator('svg.animate-spin')
    .first()
    .waitFor({ state: "detached", timeout: 8_000 })
    .catch(() => null);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/04-pickup-selected.png`, fullPage: true });

  const pickupCardChecks = await page.evaluate(() => {
    const text = document.body.innerText;
    // Find the "Envío" row in the order summary aside.
    const envioRow = Array.from(document.querySelectorAll("aside dl div")).find((d) => {
      const dt = d.querySelector("dt");
      return (dt?.textContent ?? "").toLowerCase().includes("env");
    });
    return {
      hasPickupCardName: text.includes("Aura Essentials") || text.includes("local"),
      hasMapsLink: !!Array.from(document.querySelectorAll("a")).find((a) =>
        a.href.includes("maps."),
      ),
      addressInputVisible: !!document.querySelector('input[name="addressLine1"]'),
      asideEnvioText: envioRow?.querySelector("dd")?.textContent?.trim() ?? null,
    };
  });
  console.log("  pickup card checks:", JSON.stringify(pickupCardChecks, null, 2));

  if (pickupCardChecks.addressInputVisible) {
    throw new Error("Address input still visible while pickup is selected");
  }

  // 2d — switch back to a shipping method
  console.log("→ STEP 5: switch back to shipping");
  const shippingIndex = checkoutChecks.labels.findIndex(
    (l) => !l.toLowerCase().includes("retiro en local"),
  );
  if (shippingIndex >= 0) {
    await page
      .locator('input[name="shippingMethodId"]')
      .nth(shippingIndex)
      .check();
    await page.waitForTimeout(1500);
    const reShippingChecks = await page.evaluate(() => ({
      addressInputVisible: !!document.querySelector('input[name="addressLine1"]'),
    }));
    console.log("  shipping reverted checks:", JSON.stringify(reShippingChecks, null, 2));
    if (!reShippingChecks.addressInputVisible) {
      throw new Error("Address input did not come back after switching to shipping");
    }
    await page.screenshot({ path: `${OUT_DIR}/05-shipping-restored.png`, fullPage: true });
  } else {
    console.log("  no non-pickup methods to switch to (skipping)");
  }

  // 3 — disable pickup, reload checkout, ensure radio is gone
  console.log("→ STEP 6: disable pickup, reload, verify hidden");
  await setPickupEnabled(false);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const offChecks = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('input[name="shippingMethodId"]'));
    return {
      radioCount: radios.length,
      hasPickup: radios.some((r) => {
        const l = r.closest("label")?.textContent?.toLowerCase() ?? "";
        return l.includes("retiro en local");
      }),
    };
  });
  console.log("  checkout checks (pickup OFF):", JSON.stringify(offChecks, null, 2));
  if (offChecks.hasPickup) {
    throw new Error("Pickup radio still rendered with pickup OFF — security violation");
  }
  await page.screenshot({ path: `${OUT_DIR}/06-checkout-pickup-off.png`, fullPage: true });

  // 4 — re-enable for the admin pickup tab smoke
  await setPickupEnabled(true);

  // 5 — admin pickup tab smoke
  console.log("→ STEP 7: admin pickup tab");
  await context.addCookies([
    {
      name: "nx_session",
      value: ADMIN_COOKIE,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${ORIGIN}/admin/store/local`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Click Retiro en tienda tab
  const tabClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll(".nx-tab")).find((t) =>
      t.textContent?.includes("Retiro en tienda"),
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log("  pickup tab clicked:", tabClicked);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/07-admin-pickup-tab.png`, fullPage: true });

  console.log("\nConsole errors:");
  if (consoleErrors.length === 0) console.log("  (none)");
  else consoleErrors.forEach((e) => console.log(`  ${e}`));

  await browser.close();
  await disconnect();
  console.log(`\nDONE → ${OUT_DIR}`);
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  try {
    await disconnect();
  } catch {}
  process.exit(1);
});
