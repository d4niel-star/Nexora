import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

// ─── Authenticated dashboard ────────────────────────────────────────────
//
// We rely on three structural anchors that are stable regardless of the
// merchant's underlying data:
//   1. The CommandCenter section root (`data-testid="command-center"`).
//   2. The MerchantOnboardingGuide rail (`data-testid="merchant-onboarding-guide"`).
//   3. The CTA link inside the rail (next-step block) is rendered when at
//      least one readiness item is incomplete; for an unconfigured QA
//      store there's always at least one missing item.

test.describe("phase3d · dashboard", () => {
  test("dashboard renders the command center and onboarding rail", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
    });

    const response = await page.goto(ROUTES.dashboard);
    expect(response?.ok()).toBe(true);

    await expect(page.getByTestId("command-center")).toBeVisible();
    await expect(page.getByTestId("merchant-onboarding-guide")).toBeVisible();

    // Filter known noisy errors that come from third-party scripts in
    // dev (font preloads, hot-reload hydration warnings). We only fail
    // on uncaught runtime exceptions — those are real regressions.
    const hardErrors = consoleErrors.filter(
      (err) => !/preload|hydrated|hot[-\s]?reload|next-route-announcer/i.test(err),
    );
    expect(hardErrors, hardErrors.join("\n")).toEqual([]);
  });
});
