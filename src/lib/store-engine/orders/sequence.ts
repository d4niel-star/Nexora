// ─── Sequential order number generator ──────────────────────────────────
// Replaces Math.random() with a transactional, race-safe atomic increment.
// Must be called INSIDE the same Prisma transaction that creates the Order
// so the number and the row land or neither does.
//
// Format: NX-000001, NX-000002, …
// The sequence is per-store (StoreOrderSequence.storeId is unique).
//
// If the store doesn't have a sequence row yet (first order ever), one is
// upserted with nextValue=2 and the returned number is NX-000001.

import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Atomically reserves the next order number for a given store.
 * MUST be called inside a `prisma.$transaction(async tx => { ... })`.
 */
export async function generateNextOrderNumber(
  tx: Tx,
  storeId: string,
): Promise<string> {
  // Upsert: create row if first order, or just read current value.
  // Then immediately increment via a second call. This is safe because
  // the Prisma interactive transaction holds a DB-level lock on the row.
  const seq = await tx.storeOrderSequence.upsert({
    where: { storeId },
    create: { storeId, nextValue: 2 },          // we'll use 1 now, next is 2
    update: { nextValue: { increment: 1 } },
  });

  // After upsert-with-increment, `seq.nextValue` is the NEW value.
  // For the "create" branch (first order), nextValue is 2, so current = 1.
  // For the "update" branch, nextValue = previous + 1, so current = previous.
  // In both cases: the order number we should use = nextValue - 1 (the one
  // just consumed). BUT the "create" path sets nextValue=2 without
  // increment, so on that branch the value is 2, consumed = 1.
  // The "update" path: nextValue was N, now N+1, consumed = N.

  // Prisma upsert returns the row AFTER the mutation. For "create" the row
  // has nextValue=2 (we return 1). For "update" the row has the
  // incremented value (we return that - 1).
  const consumed = seq.nextValue - 1;

  return `NX-${String(consumed).padStart(6, "0")}`;
}
