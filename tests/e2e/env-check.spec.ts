import { test, expect } from "@playwright/test";

import { ROUTES } from "./helpers/routes";

// ─── /api/internal/env-check ────────────────────────────────────────────
//
// The endpoint was added in 3C.1 to let operators sanity-check Render
// without dropping into a shell. We must validate two contracts:
//   1. Without a header it never leaks the env summary (401 / 503).
//   2. With a wrong header it also responds 401.
// We do NOT test the success path here because it would require us to
// inject CRON_SECRET into the test process, which is brittle and adds
// no signal beyond what `scripts/check-envs.ts` already covers.

test.describe("phase3d · env-check protección", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("returns 401/503 with no auth header", async ({ request }) => {
    const response = await request.get(ROUTES.envCheck);
    expect([401, 503]).toContain(response.status());
    const body = await response.json().catch(() => null);
    // Either error message is acceptable; both shapes intentionally
    // omit the env summary so the response body must NOT contain a
    // `requiredMissing` key (which only appears on 200).
    expect(body && body.requiredMissing).toBeFalsy();
  });

  test("returns 401 with a wrong x-cron-secret", async ({ request }) => {
    const response = await request.get(ROUTES.envCheck, {
      headers: { "x-cron-secret": "obviously-wrong-secret-zzz" },
    });
    expect([401, 503]).toContain(response.status());
  });
});
