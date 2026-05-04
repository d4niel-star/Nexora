import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

// ─── /admin guards ──────────────────────────────────────────────────────
//
// The middleware in `src/proxy.ts` redirects unauthenticated /admin/*
// traffic to /home/login with a `from=` query param. We verify that
// behavior end-to-end by clearing the storage state for this single
// test (the rest of the suite keeps the authenticated cookie).

test.describe("phase3d · admin guard", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/admin redirects to login when no session is present", async ({ page }) => {
    await page.goto(ROUTES.admin);

    // Final URL must be the login page, regardless of which exact admin
    // path the middleware redirected from. The `from=` query param is a
    // bonus assertion: it proves the redirect was driven by the guard
    // and not by a generic 404 fallback.
    await expect(page).toHaveURL(/\/home\/login(\?|$)/);
    expect(page.url()).toContain("from=%2Fadmin");
  });

  test("/admin/dashboard redirects to login when no session is present", async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await expect(page).toHaveURL(/\/home\/login/);
  });

  test("public login page renders without a session", async ({ page }) => {
    const response = await page.goto(ROUTES.login);
    expect(response?.ok()).toBe(true);
    // The login form has an email input with explicit placeholder; we
    // assert on the role rather than the visible label so the test
    // tolerates copy changes.
    await expect(page.getByRole("textbox", { name: /correo/i })).toBeVisible();
  });
});
