import { test, expect } from "@playwright/test";

import { disconnectPrisma, getActiveStoreSlug } from "./helpers/fixtures";
import { storefrontCart } from "./helpers/routes";

// ─── Checkout / cart smoke ──────────────────────────────────────────────
//
// We refuse to drive a real Mercado Pago preference creation: that
// requires live credentials and would mutate billing state. Instead we
// just confirm the cart page loads as an empty cart for an anonymous
// visitor — proves the storefront / cart shell renders without
// requiring the rest of the checkout flow.

test.describe("phase3d · checkout smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test("empty cart loads for an anonymous visitor", async ({ page }) => {
    const slug = await getActiveStoreSlug();
    test.skip(!slug, "No active store in the dev DB; skipping cart smoke.");

    const response = await page.goto(storefrontCart(slug!));
    expect(response?.ok()).toBe(true);
    // Cart pages render even when empty — we assert no crash and that
    // we did not get redirected to a 404. Detailed cart UI behaviour
    // is out of scope for the smoke; this is just a "shell renders"
    // probe.
    await expect(page).toHaveURL(/\/cart/);
  });
});
