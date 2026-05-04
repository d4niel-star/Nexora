import { defineConfig, devices } from "@playwright/test";

// ─── Playwright config · Phase 3D ───────────────────────────────────────
//
// Minimal smoke suite for Nexora. Goals:
//   1. Single browser (chromium) — speed > coverage; flaky cross-browser
//      tests have nothing to gain in a smoke suite.
//   2. Single worker — the suite mutates shared QA fixtures; serial
//      execution avoids race conditions on the dev DB.
//   3. webServer auto-starts `npm run dev` and reuses an already-running
//      one. Long startup (Next 16 + Turbopack first compile) is absorbed
//      by `timeout: 180_000`; subsequent reruns are warm.
//   4. storageState produced by `tests/e2e/auth.setup.ts` is reused by
//      every test that needs an authenticated admin session. The setup
//      project depends on it explicitly so it always runs first.
//
// What this config DOES NOT do:
//   · It never auto-runs prisma migrate / db seed. Tests assume the dev
//     DB is reachable and contains at least one Store. Auth setup is
//     idempotent: it upserts a QA user, sub and session every run.
//   · It never sends real email, never hits MercadoPago, never touches
//     carrier APIs. All those flows are smoke-tested via UI presence
//     only, with the underlying integrations stubbed by absence of env.

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const STORAGE_STATE = "tests/e2e/.auth/admin.json";

export default defineConfig({
  testDir: "tests/e2e",
  // Smoke pace — tests must be cheap to run repeatedly. The DEV server
  // first-paint can be slow on cold cache so allow 60s navigation.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
      // Spec files live at the root of tests/e2e/. The setup file is
      // matched separately above so it isn't picked up here.
      testMatch: /.*\.spec\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
