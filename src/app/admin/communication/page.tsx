import { redirect } from "next/navigation";

// ─── /admin/communication → /admin/store?tab=comunicacion ──────────────
//
// Comunicación used to be a top-level admin category. As of the IA
// reshuffle it lives as a tab inside Mi tienda (Resumen · Comunicación ·
// Dominio · Pagos). Old deep links, bookmarks, dashboard CTAs and
// onboarding checklists may still point at /admin/communication, so we
// keep the route as a permanent redirect instead of deleting it.
//
// `dynamic = "force-dynamic"` makes sure no stale RSC payload is served
// from the build cache after the IA change.

export const dynamic = "force-dynamic";

export default function AdminCommunicationRedirectPage() {
  redirect("/admin/store?tab=comunicacion");
}
