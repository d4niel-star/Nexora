import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { listOffersForAdmin } from "@/lib/apps/bundles-upsells/queries";
import { OfferList } from "@/components/admin/apps/bundles-upsells/OfferList";

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

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.bundlesUpsells);

  return <OfferList offers={offers} planAllows={planAllows} />;
}
