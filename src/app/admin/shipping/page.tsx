import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { CARRIERS } from "@/lib/shipping/registry";
import { listCarrierSummaries } from "@/lib/shipping/store-connection";
import { getStoreShippingSettings } from "@/lib/shipping/store-settings";
import { ShippingHub } from "@/components/admin/shipping/ShippingHub";

export const metadata = {
  title: "Envíos | Nexora",
};

export const dynamic = "force-dynamic";

export default async function ShippingHubPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/home/login");

  const [summaries, settings] = await Promise.all([
    listCarrierSummaries(store.id),
    getStoreShippingSettings(store.id),
  ]);

  const carriers = CARRIERS.map(({ adapter, ...meta }) => ({
    meta: {
      ...meta,
      capabilities: adapter.capabilities,
    },
    summary:
      summaries.find((s) => s.carrier === meta.id) ?? {
        carrier: meta.id,
        status: "disconnected" as const,
        environment: "production" as const,
        accountUsername: null,
        accountClientNumber: null,
        accountDisplayName: null,
        externalAccountId: null,
        hasStoredPassword: false,
        lastError: null,
        connectedAt: null,
        lastValidatedAt: null,
        config: {},
      },
  }));

  return (
    <div className="mx-auto max-w-[1100px]">
      <ShippingHub carriers={carriers} settings={settings} />
    </div>
  );
}
