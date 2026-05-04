import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

// ─── Phase 3D smoke ─────────────────────────────────────────────────────
//
// Fast, low-flake checks that prove the auth shell, the storeholder
// dashboard and the protected env-check endpoint are wired up. This
// suite is what `npm run test:e2e:smoke` runs; the rest of the
// individual spec files cover the deeper surfaces.

test.describe("phase3d · smoke", () => {
  test("env-check endpoint rejects unauthenticated GET", async ({ request }) => {
    // Calling without a Bearer token / x-cron-secret must never leak the
    // environment summary. 503 is acceptable when CRON_SECRET is unset
    // locally (see the route — that's the documented dev-fail signal).
    const response = await request.get(ROUTES.envCheck);
    expect([401, 503]).toContain(response.status());
  });

  test("admin dashboard loads when authenticated", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(ROUTES.dashboard);
    expect(response?.ok()).toBe(true);

    // The CommandCenter renders a section with the merchant onboarding
    // guide rail. We use the heading text as a stable anchor; the rail
    // itself is `data-testid` tagged in the component.
    await expect(page.getByTestId("merchant-onboarding-guide")).toBeVisible({
      timeout: 15_000,
    });

    // Sanity: no uncaught client errors during initial paint.
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
