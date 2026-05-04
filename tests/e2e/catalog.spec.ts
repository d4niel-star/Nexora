import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

test.describe("phase3d · catálogo", () => {
  test("catalog page loads without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(ROUTES.catalog);
    expect(response?.ok()).toBe(true);

    // The catalog page header text is part of the admin shell. We assert
    // the URL stays on /admin/catalog (i.e. we did not get bounced by
    // the auth guard or onboarding gate) and that no client crash
    // bubbled up to the browser.
    await expect(page).toHaveURL(/\/admin\/catalog/);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
