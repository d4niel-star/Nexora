import { Suspense } from "react";

import { LocalStorePage } from "@/components/admin/store/local/LocalStorePage";
import {
  getDailyOperationalSummary,
  getLocalStockRows,
  getOpenCashSession,
  getOrCreateLocationProfile,
  listPendingPickupOrders,
} from "@/lib/local-store/queries";
import { getCurrentStore } from "@/lib/auth/session";

// Force dynamic rendering. Local-store data (open cash session, stock,
// pickup orders, today's sales) is read-write and changes on every
// admin interaction. We never want to serve a stale RSC payload here
// because the merchant is operating live.
export const dynamic = "force-dynamic";

export default async function LocalStoreRoute() {
  const store = await getCurrentStore();
  if (!store) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[color:var(--ink-5)]">
          Necesitás iniciar sesión para acceder al local físico.
        </p>
      </div>
    );
  }

  const [profile, summary, stockRows, openSession, pickupOrders] = await Promise.all([
    getOrCreateLocationProfile(),
    getDailyOperationalSummary(),
    getLocalStockRows({}),
    getOpenCashSession(),
    listPendingPickupOrders(),
  ]);

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[color:var(--ink-5)]">
          No se pudo cargar el perfil del local. Probá recargar la página.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-8 text-sm">Cargando local físico…</div>}>
      <LocalStorePage
        profile={profile}
        summary={summary}
        stockRows={stockRows}
        openSession={openSession}
        pickupOrders={pickupOrders}
      />
    </Suspense>
  );
}
