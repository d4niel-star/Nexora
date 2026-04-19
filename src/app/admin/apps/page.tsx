import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { getAppCatalog, getCatalogSummary } from "@/lib/apps/queries";
import { AppsCatalog } from "@/components/admin/apps/AppsCatalog";

export const metadata = {
  title: "Nexora Apps",
};

export default async function AppsIndexPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [catalog, summary] = await Promise.all([
    getAppCatalog(store.id),
    getCatalogSummary(store.id),
  ]);

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">
          Nexora Apps.
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
          Extensiones curadas de Nexora. Cada app resuelve un problema concreto
          de ecommerce y se activa sin código.
        </p>
      </div>

      <AppsCatalog catalog={catalog} summary={summary} />
    </div>
  );
}
