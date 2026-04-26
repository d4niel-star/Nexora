import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { getAppCatalog, getCatalogSummary } from "@/lib/apps/queries";
import { listExternalApps } from "@/lib/marketplace/external-registry";
import { MarketplacePage } from "@/components/admin/marketplace/MarketplacePage";

// ─── Marketplace · server entry ──────────────────────────────────────────
//
// Único punto de entrada para `/admin/marketplace`. Hidrata dos catálogos
// distintos en una sola página:
//
//   · Catálogo INTERNO (Nexora): registry curado con estado tenant-aware
//     (instalación + plan gating). Reutilizamos getAppCatalog() para no
//     duplicar lógica.
//
//   · Catálogo EXTERNO (terceros): registry estático con apps de vendors
//     reales (Google Analytics, Mailchimp, Hotjar, etc.) y disponibilidad
//     honesta. Sin instalación falsa: cada entry declara su `action.kind`.
//
// La separación entre los dos es explícita en el cliente (tabs) — nunca
// se mezclan en una misma lista.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace · Nexora",
};

export default async function MarketplaceIndexPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [internalCatalog, summary] = await Promise.all([
    getAppCatalog(store.id),
    getCatalogSummary(store.id),
  ]);

  const externalCatalog = listExternalApps();

  return (
    <MarketplacePage
      internalCatalog={internalCatalog}
      internalSummary={summary}
      externalCatalog={externalCatalog}
    />
  );
}
