import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

test.describe("phase3d · comunicación", () => {
  test("communication tab exposes email channels", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // /admin/communication redirects to /admin/store?tab=comunicacion (the
    // category lives inside Mi tienda after the IA reshuffle). The smoke
    // verifies the redirect lands on a 200 and the embedded
    // CommunicationPage exposes its email-automations tab — proof that
    // the merchant can reach the email tools in two clicks.
    const response = await page.goto(ROUTES.communication);
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/admin\/store/);

    // The CommunicationPage exposes a sub-nav of section pills. The
    // "E-mails automáticos" pill is what gates the EmailOperationsPanel
    // (Herramientas de email). We click it and assert the panel body.
    const emailsTab = page.getByRole("button", { name: /e-?mails autom/i });
    await expect(emailsTab.first()).toBeVisible({ timeout: 15_000 });
    await emailsTab.first().click();

    await expect(
      page.getByRole("heading", { name: /herramientas de email/i }),
    ).toBeVisible({ timeout: 15_000 });

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
