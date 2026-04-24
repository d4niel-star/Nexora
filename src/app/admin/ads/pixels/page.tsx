import { unstable_noStore as noStore } from "next/cache";

import { PixelsHub } from "@/components/admin/ads/PixelsHub";
import { getAllPixelConfigs } from "@/lib/ads/pixels/actions";

// Píxeles y tags hub. Loads the pixel/tag configuration for every
// supported provider (Meta / TikTok / Google) and renders one editable
// card per provider. The data lives on AdPlatformConnection.configJson;
// see lib/ads/pixels/actions.ts for the persistence rules.
export default async function PixelsPage() {
  noStore();

  const { getAdminStoreInitialData } = await import("@/lib/store-engine/queries");
  const initialData = await getAdminStoreInitialData();
  if (!initialData) {
    return (
      <div className="p-8 text-ink-5 text-sm">
        No se encontró la tienda. Configurá tu tienda antes de pegar identificadores.
      </div>
    );
  }
  const storeId = initialData.store.id;

  const configs = await getAllPixelConfigs(storeId);

  return <PixelsHub storeId={storeId} configs={configs} />;
}
