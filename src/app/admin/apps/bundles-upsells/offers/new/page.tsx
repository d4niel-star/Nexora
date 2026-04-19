import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { listPublishedProductsForStore } from "@/lib/apps/bundles-upsells/queries";
import { OfferForm } from "@/components/admin/apps/bundles-upsells/OfferForm";

export const metadata = { title: "Nueva oferta · Bundles & upsells" };

export default async function NewOfferPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [sub, products] = await Promise.all([
    prisma.storeSubscription.findUnique({
      where: { storeId: store.id },
      include: { plan: true },
    }),
    listPublishedProductsForStore(store.id),
  ]);

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.bundlesUpsells);

  return <OfferForm mode="create" products={products} planAllows={planAllows} />;
}
