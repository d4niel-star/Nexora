import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { getRecoverySnapshot } from "@/lib/recovery/signals";
import { RecoveryPage } from "@/components/admin/recovery/RecoveryPage";

// ─── /admin/recovery — Ventas > Recuperación ───────────────────────────
//
// Replaces the legacy "Crecimiento" hub. Reads only from real DB state
// (orders, carts, aggregated customers, app settings) — no projections,
// no scores. Tenant-scoped + session-dependent: never statically
// prerendered.

export const dynamic = "force-dynamic";

export default async function AdminRecoveryPage() {
  // Defensive: a transient session resolution failure should redirect
  // to login, never 500 the route. Same pattern used in the rest of
  // the admin tree.
  let storeId: string | null = null;
  try {
    const store = await getCurrentStore();
    storeId = store?.id ?? null;
  } catch (error) {
    console.error("[Recovery] getCurrentStore threw:", error);
  }

  if (!storeId) redirect("/home/login");

  const snapshot = await getRecoverySnapshot(storeId);
  return <RecoveryPage snapshot={snapshot} />;
}
