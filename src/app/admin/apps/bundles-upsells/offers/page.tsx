import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { listOffersForAdmin } from "@/lib/apps/bundles-upsells/queries";
import { OfferList } from "@/components/admin/apps/bundles-upsells/OfferList";
import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";

export const metadata = { title: "Bundles & upsells · Ofertas" };

export default async function BundlesOffersPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [sub, offers] = await Promise.all([
    prisma.storeSubscription.findUnique({
      where: { storeId: store.id },
      include: { plan: true },
    }),
    listOffersForAdmin(store.id),
  ]);

  const planConfig =
    sub?.plan && (sub.status === "active" || sub.status === "trialing")
      ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config ?? null
      : null;
  const planAllows = Boolean(planConfig?.bundlesUpsells);

  if (!planAllows) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-6">
        <UpgradePrompt
          title="Bundles & Upsells Bloqueado"
          description="Tu plan actual no incluye sugerencias de productos complementarios. Actualizá a Growth para elevar automáticamente tu ticket promedio."
          feature="advanced"
          planCode="growth"
        />
      </div>
    );
  }

  return <OfferList offers={offers} planAllows={true} />;
}
