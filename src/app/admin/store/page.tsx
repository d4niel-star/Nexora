import { StorePage } from "@/components/admin/store/StorePage";
import { getAdminStoreInitialData } from "@/lib/store-engine/queries";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";
import { isCurrentUserOps } from "@/lib/auth/ops";
import { getCurrentStore } from "@/lib/auth/session";
import { getCommunicationSettings } from "@/lib/communication/queries";
import type { CommunicationSettings } from "@/lib/communication/types";

import { Suspense } from "react";

// Force dynamic rendering. The store-level state (paymentProvider status,
// products, onboarding) changes frequently and must reflect writes made in
// the same request cycle — e.g. right after the Mercado Pago OAuth callback
// upserts the StorePaymentProvider row and calls revalidatePath("/admin/store").
// Without this, Next may serve a stale RSC payload and the UI keeps
// showing "Checkout desactivado" even though the DB says "connected".
export const dynamic = "force-dynamic";

export default async function StoreRoute() {
  // Platform readiness and ops flag are resolved server-side so that the
  // tenant UI can render fail-honest states (no dead CTA, ops-only routing
  // to the platform settings screen) without leaking env names to merchants.
  const [initialData, platformReadiness, isOps, currentStore] = await Promise.all([
    getAdminStoreInitialData(),
    Promise.resolve(getMercadoPagoPlatformReadiness()),
    isCurrentUserOps(),
    getCurrentStore().catch(() => null),
  ]);

  // Communication settings live inside the Mi tienda > Comunicación tab.
  // We fetch them here so the tab opens hydrated and the client component
  // does not need to round-trip on first paint. If the fetch fails (e.g.
  // missing session, transient DB error) we fall back to `null` and let
  // the tab render its own honest empty state instead of crashing the
  // whole Mi tienda surface.
  let communicationSettings: CommunicationSettings | null = null;
  if (currentStore?.id) {
    try {
      communicationSettings = await getCommunicationSettings(currentStore.id);
    } catch (error) {
      console.error("[Store] getCommunicationSettings failed:", error);
    }
  }

  return (
    <Suspense fallback={<div>Cargando panel de tienda...</div>}>
      <StorePage
        initialData={initialData}
        mercadoPagoPlatformReadiness={platformReadiness}
        isOps={isOps}
        communicationSettings={communicationSettings}
      />
    </Suspense>
  );
}
