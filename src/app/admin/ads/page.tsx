import { Suspense } from "react";
import { AdsCopilotView } from "@/components/admin/ads/AdsCopilotView";
import { getAdsConnections } from "@/lib/ads/connections/actions";
import { getStoreRecommendations } from "@/lib/ads/ai/actions";
import { getCampaignDrafts, getInsightSnapshots } from "@/lib/ads/drafts/actions";
import { unstable_noStore as noStore } from "next/cache";

export default async function AdsStandalonePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  noStore();
  
  const { getAdminStoreInitialData } = await import("@/lib/store-engine/queries");
  const initialData = await getAdminStoreInitialData();
  if (!initialData) return <div>No store found</div>;
  const storeId = initialData.store.id;

  const [connections, recommendations, drafts, insights] = await Promise.all([
    getAdsConnections(storeId),
    getStoreRecommendations(storeId),
    getCampaignDrafts(storeId),
    getInsightSnapshots(storeId),
  ]);

  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<div>Cargando Ads...</div>}>
      <AdsCopilotView
        storeId={storeId}
        connections={connections}
        recommendations={recommendations}
        drafts={drafts}
        insights={insights}
        searchParams={resolvedSearchParams}
        standalone
      />
    </Suspense>
  );
}