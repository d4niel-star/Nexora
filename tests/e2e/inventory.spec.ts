import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

test.describe("phase3d · inventario", () => {
  test("inventory page loads without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(ROUTES.inventory);
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/admin\/inventory/);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
