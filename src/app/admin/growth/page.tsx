import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { getGrowthSnapshot } from "@/lib/growth/signals";
import { GrowthPage } from "@/components/admin/growth/GrowthPage";

// ─── /admin/growth ──────────────────────────────────────────────────────
// Lifecycle + retention hub. Reads exclusively from real DB state via
// getGrowthSnapshot — no client-side fabrication, no random metrics.
// Tenant-scoped and session-dependent, so must NEVER be statically
// prerendered (build would crash without a session).

export const dynamic = "force-dynamic";

export default async function AdminGrowthPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/login");

  const snapshot = await getGrowthSnapshot(store.id);
  return <GrowthPage snapshot={snapshot} />;
}
