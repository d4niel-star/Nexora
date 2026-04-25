import { redirect } from "next/navigation";

// ─── /admin/diagnostics → /admin/conversion ─────────────────────────────
//
// The previous IA pass introduced "Diagnóstico" as a sub-tab of
// Estadísticas, but it was operational/readiness in nature and didn't
// belong next to Rendimiento. The Estadísticas family now hosts
// "Conversión", a purely analytical surface (cart → paid funnel built
// from real signals).
//
// /admin/diagnostics is kept as a permanent redirect so any deep links,
// bookmarks, dashboard CTAs or onboarding checklists that still point
// here continue to work.

export const dynamic = "force-dynamic";

export default function AdminDiagnosticsRedirectPage() {
  redirect("/admin/conversion");
}
