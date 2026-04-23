import { notFound, redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { getCarrierBySlug } from "@/lib/shipping/registry";
import { getCarrierConnectionSummary } from "@/lib/shipping/store-connection";
import { CarrierIntegrationPage } from "@/components/admin/shipping/CarrierIntegrationPage";

export const metadata = {
  title: "Andreani · Envíos | Nexora",
};

export const dynamic = "force-dynamic";

export default async function AndreaniPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/home/login");

  const carrier = getCarrierBySlug("andreani");
  if (!carrier) notFound();

  const summary = await getCarrierConnectionSummary(store.id, carrier.id);

  return (
    <div className="mx-auto max-w-[1100px]">
      <CarrierIntegrationPage carrier={carrier} summary={summary} />
    </div>
  );
}
