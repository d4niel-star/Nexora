// ─── Pickup reservation expiration · CLI ────────────────────────────────
//
// Standalone entry point for releasing local stock reserved by
// abandoned pickup orders. Calls the same core service that backs
// `/api/cron/expire-pickup-reservations`, so CLI runs cannot drift
// from cron runs.
//
// Usage:
//   npx tsx scripts/expire-pickup-reservations.ts
//   npx tsx scripts/expire-pickup-reservations.ts --dry-run
//   npx tsx scripts/expire-pickup-reservations.ts --older-than=15 --limit=50
//
// Env overrides (applied only when the flag is not supplied):
//   PICKUP_RESERVATION_TTL_MINUTES   default TTL in minutes (default 60)
//
// The script does NOT require `CRON_SECRET` — it hits the database
// directly through Prisma, inheriting the trust boundary of whoever
// can invoke `npx tsx` on the server. Exit code 0 on success (even
// if no order matched), 1 if the core service threw or any per-order
// error was recorded.

import { expireAbandonedPickupReservations } from "@/lib/store-engine/pickup/expire-reservations";

type CliFlags = {
  dryRun: boolean;
  olderThanMinutes?: number;
  limit?: number;
};

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = { dryRun: false };
  for (const raw of argv) {
    if (raw === "--dry-run" || raw === "--dryRun" || raw === "-n") {
      flags.dryRun = true;
      continue;
    }
    const eq = raw.indexOf("=");
    if (eq === -1) continue;
    const key = raw.slice(0, eq);
    const value = raw.slice(eq + 1);
    if (key === "--older-than" || key === "--olderThanMinutes") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) flags.olderThanMinutes = parsed;
    } else if (key === "--limit") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) flags.limit = parsed;
    }
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  console.log("[pickup-expire] starting", {
    dryRun: flags.dryRun,
    olderThanMinutes: flags.olderThanMinutes ?? "(default/env)",
    limit: flags.limit ?? "(default 200)",
  });

  const summary = await expireAbandonedPickupReservations({
    source: "script",
    dryRun: flags.dryRun,
    olderThanMinutes: flags.olderThanMinutes,
    limit: flags.limit,
  });

  // Pretty print the summary so operators can screenshot the run.
  console.log("[pickup-expire] summary", {
    ...summary,
    // expiredOrders already structured; keep printed separately below
    expiredOrders: undefined,
  });

  if (summary.expiredOrders.length > 0) {
    console.log("[pickup-expire] expired orders:");
    for (const row of summary.expiredOrders) {
      console.log(
        `  · ${row.orderNumber} (${row.orderId}) age=${row.ageMinutes}m restored=${row.restored}`,
      );
    }
  }

  if (summary.errors > 0) {
    console.error("[pickup-expire] errors:");
    for (const err of summary.errorDetails) {
      console.error(`  · ${err.orderId}: ${err.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[pickup-expire] fatal", err);
  process.exit(1);
});
