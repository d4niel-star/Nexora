import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { getDiagnosticSnapshot } from "@/lib/diagnostics/snapshot";
import { DiagnosticsPage } from "@/components/admin/diagnostics/DiagnosticsPage";

// ─── /admin/diagnostics — Estadísticas > Diagnóstico ────────────────────
//
// Replaces the legacy "Finanzas" sub-tab inside Estadísticas. Reads
// exclusively from existing snapshots (readiness, integrations health,
// stock counts) — never invents numbers. Tenant-scoped and
// session-dependent, so it must NEVER be statically prerendered.

export const dynamic = "force-dynamic";

export default async function AdminDiagnosticsPage() {
  // Same defensive pattern used in /admin/communication: don't let a
  // transient session resolution failure 500 the whole route. The admin
  // layout already runs the same auth check, so a redirect loop is not
  // possible — if the session truly cannot be read, the user is already
  // at /home/login by the time this catch fires.
  let storeId: string | null = null;
  try {
    const store = await getCurrentStore();
    storeId = store?.id ?? null;
  } catch (error) {
    console.error("[Diagnostics] getCurrentStore threw:", error);
  }

  if (!storeId) redirect("/home/login");

  const snapshot = await getDiagnosticSnapshot(storeId);
  return <DiagnosticsPage snapshot={snapshot} />;
}
