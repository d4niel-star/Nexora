import { StorePage } from "@/components/admin/store/StorePage";
import { getAdminStoreInitialData } from "@/lib/store-engine/queries";

import { Suspense } from "react";

export default async function StoreRoute() {
  const initialData = await getAdminStoreInitialData();
  return (
    <Suspense fallback={<div>Cargando panel de tienda...</div>}>
      <StorePage initialData={initialData} />
    </Suspense>
  );
}
