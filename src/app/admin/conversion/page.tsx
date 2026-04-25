import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { getConversionSnapshot } from "@/lib/conversion/snapshot";
import { ConversionPage } from "@/components/admin/conversion/ConversionPage";

// ─── /admin/conversion — Estadísticas > Conversión ──────────────────────
//
// Replaces the legacy /admin/diagnostics surface inside Estadísticas. The
// previous one was operational/readiness in nature and didn't belong
// next to Rendimiento. Conversión is purely analytical: cart → paid
// funnel built from real signals, with an honest "qué falta medir" note
// for everything we don't capture yet.
//
// Tenant-scoped and session-dependent — must never be statically
// prerendered.

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function AdminConversionPage({ searchParams }: Props) {
  // Defensive session resolution: an admin layout already enforces auth,
  // so we can safely fall back to a redirect if getCurrentStore fails
  // transiently instead of 500-ing the whole route.
  let storeId: string | null = null;
  try {
    const store = await getCurrentStore();
    storeId = store?.id ?? null;
  } catch (error) {
    console.error("[Conversion] getCurrentStore threw:", error);
  }

  if (!storeId) redirect("/home/login");

  const params = await searchParams;
  const snapshot = await getConversionSnapshot(storeId, {
    from: params.from,
    to: params.to,
  });

  return <ConversionPage snapshot={snapshot} />;
}
