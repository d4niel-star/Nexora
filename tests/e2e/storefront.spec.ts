import { test, expect } from "@playwright/test";

import { disconnectPrisma, getActiveStoreSlug } from "./helpers/fixtures";
import { storefrontHome, storefrontProducts } from "./helpers/routes";

// ─── Storefront público ─────────────────────────────────────────────────
//
// These tests don't need an admin session; they exercise the public
// storefront path. We force `storageState: undefined` for this whole
// describe block so we run as an anonymous browser.

test.describe("phase3d · storefront público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test("storefront home loads if a store exists", async ({ page }) => {
    const slug = await getActiveStoreSlug();
    test.skip(!slug, "No active store in the dev DB; skipping storefront smoke.");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(storefrontHome(slug!));
    expect(response?.ok()).toBe(true);

    // Storefronts always render a footer with the year — we assert on
    // the document body length as a paint-completed signal rather than
    // any specific text, because the design and copy can change.
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("storefront products list loads if a store exists", async ({ page }) => {
    const slug = await getActiveStoreSlug();
    test.skip(!slug, "No active store in the dev DB; skipping storefront products smoke.");

    const response = await page.goto(storefrontProducts(slug!));
    expect(response?.ok()).toBe(true);
  });
});
