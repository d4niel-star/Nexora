import { redirect } from "next/navigation";

// ─── /admin/growth → /admin/recovery ───────────────────────────────────
//
// Crecimiento (post-purchase / lifecycle hub) overlapped conceptually
// with Estadísticas > Rendimiento. The Ventas surface was reframed as
// Recuperación, focused on real recoverable money/clients instead of
// duplicate analytics.
//
// Old deep links, dashboard CTAs and onboarding checklists may still
// point at /admin/growth, so we keep the route as a permanent redirect
// to the new hub.

export const dynamic = "force-dynamic";

export default function AdminGrowthRedirectPage() {
  redirect("/admin/recovery");
}
