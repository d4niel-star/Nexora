import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";

import { ProviderHub } from "@/components/admin/ads/ProviderHub";
import {
  ADS_PROVIDERS,
  isAdsProvider,
  type AdsProviderId,
} from "@/lib/ads/registry";
import { getAdsConnections } from "@/lib/ads/connections/actions";
import { getStoreRecommendations } from "@/lib/ads/ai/actions";
import {
  getCampaignDrafts,
  getInsightSnapshots,
} from "@/lib/ads/drafts/actions";
import { getPixelConfig } from "@/lib/ads/pixels/actions";

// ─── /admin/ads/[provider] ──────────────────────────────────────────────
//
// Dynamic route that backs the three provider sidebar leaves: meta,
// tiktok, google. Anything else 404s. The page is a thin server
// component that fetches per-provider data, filters the cross-cutting
// AI artefacts (recommendations / drafts / insights) by platform and
// hands a clean payload to <ProviderHub />.

const VALID = new Set<AdsProviderId>(["meta", "tiktok", "google"]);

interface Props {
  params: Promise<{ provider: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateStaticParams() {
  return Array.from(VALID).map((p) => ({ provider: p }));
}

export default async function ProviderPage({ params, searchParams }: Props) {
  noStore();
  const { provider } = await params;
  if (!isAdsProvider(provider)) notFound();

  const meta = ADS_PROVIDERS[provider];

  const { getAdminStoreInitialData } = await import("@/lib/store-engine/queries");
  const initialData = await getAdminStoreInitialData();
  if (!initialData) notFound();
  const storeId = initialData.store.id;

  const [connections, recommendations, drafts, insights, pixelSnapshot] = await Promise.all([
    getAdsConnections(storeId),
    getStoreRecommendations(storeId),
    getCampaignDrafts(storeId),
    getInsightSnapshots(storeId),
    getPixelConfig(storeId, provider),
  ]);

  const connection = connections.find((c) => c.platform === provider) ?? null;
  const platformRecos = recommendations.filter((r) => r.platform === provider);
  const platformDrafts = drafts.filter((d) => d.platform === provider);
  const platformInsights = insights.filter((i) => i.platform === provider);

  const envReady = meta.requiredEnv.every((k) => !!process.env[k]);
  const configuredPixels = meta.pixelFields.filter(
    (f) => (pixelSnapshot.config[f.key] ?? "").trim().length > 0,
  ).length;

  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<div className="p-8 text-ink-5 text-sm">Cargando {meta.label}…</div>}>
      <ProviderHub
        storeId={storeId}
        provider={meta}
        connection={connection}
        recommendations={platformRecos}
        drafts={platformDrafts}
        insights={platformInsights}
        pixelFieldsConfigured={configuredPixels}
        pixelFieldsTotal={meta.pixelFields.length}
        envReady={envReady}
        searchParams={resolvedSearchParams}
      />
    </Suspense>
  );
}
