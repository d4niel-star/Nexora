import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";
import { disconnectPrisma, getAnyOrderNumber } from "./helpers/fixtures";

test.afterAll(async () => {
  await disconnectPrisma();
});

test.describe("phase3d · órdenes", () => {
  test("orders page loads without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(ROUTES.orders);
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/admin\/orders/);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("orders search input does not crash on submit", async ({ page }) => {
    await page.goto(ROUTES.orders);
    // Locate any visible search box. If the page lays out without one
    // (no orders) we accept that and skip the interaction — the table
    // empty state is also a passing condition for "loaded without crash".
    const searchInput = page.getByRole("searchbox").first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("nonexistent-order-zzz-1234");
      await searchInput.press("Enter");
      // Wait for navigation / soft-nav debounce; just assert we stayed
      // on the orders surface.
      await expect(page).toHaveURL(/\/admin\/orders/);
    }
  });

  test("if a fixture order exists, the order detail surface loads", async ({ page }) => {
    const orderNumber = await getAnyOrderNumber();
    test.skip(!orderNumber, "No orders in the dev DB; skipping order detail smoke.");

    // Orders surface today is a list with optional drawer. We don't
    // assume a specific URL pattern for an individual order — instead
    // we filter the list by the known orderNumber and verify it shows.
    await page.goto(ROUTES.orders + `?q=${encodeURIComponent(orderNumber!)}`);
    await expect(page.getByText(orderNumber!).first()).toBeVisible({ timeout: 15_000 });
  });
});
