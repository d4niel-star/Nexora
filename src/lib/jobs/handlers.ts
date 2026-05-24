import { registerJobHandler } from "./types";
import { ensureAutomationHandlersRegistered } from "./automation-handlers";

// ─── Job Handler Registrations ────────────────────────────────────────
// Central registration module — imported once by the queue runner so
// handlers are available before drain. Keeping registrations in one
// file avoids fragile side-effect imports scattered across the codebase.
//
// Today's handlers are minimal stubs that prove the queue end-to-end
// (enqueue → claim → run → log). The legacy synchronous cron jobs for
// abandoned-cart, dunning, etc. continue to run in their existing routes.
// Migrating them onto the queue is incremental and tracked in 7A.2.

let registered = false;

export function ensureJobHandlersRegistered(): void {
  if (registered) return;
  registered = true;

  // Phase 7B.2 — automation handlers (abandoned_cart, dunning, etc.)
  ensureAutomationHandlersRegistered();

  // ─── webhook_redelivery ───
  // A no-op handler that proves the round-trip. Real webhook redelivery
  // will populate this with the actual replay logic.
  registerJobHandler("webhook_redelivery", async (ctx) => {
    return {
      ok: true,
      metadata: { acknowledged: true, payloadKeys: Object.keys(ctx.payload) },
    };
  });

  // ─── csv_export ───
  // Placeholder for async CSV exports. Real implementation will write
  // to object storage and emit an email link to the actor.
  registerJobHandler("csv_export", async (ctx) => {
    if (!ctx.storeId) return { ok: false, error: "csv_export requires storeId" };
    return { ok: true, metadata: { storeId: ctx.storeId } };
  });

  // ─── automation_run ───
  // Generic shell for "run automation X for store Y" — used as the
  // queue migration target for abandoned-carts, review-requests, etc.
  registerJobHandler("automation_run", async (ctx) => {
    const automKey = typeof ctx.payload.automKey === "string" ? ctx.payload.automKey : null;
    if (!automKey) return { ok: false, error: "automation_run requires payload.automKey" };
    if (!ctx.storeId) return { ok: false, error: "automation_run requires storeId" };
    return { ok: true, metadata: { automKey, storeId: ctx.storeId } };
  });
}
