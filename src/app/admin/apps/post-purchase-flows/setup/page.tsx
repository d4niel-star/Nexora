import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { getPostPurchaseSettings } from "@/lib/apps/post-purchase-flows/settings";
import { FlowsSetup } from "@/components/admin/apps/post-purchase-flows/FlowsSetup";

export const metadata = {
  title: "Post-purchase flows · Setup",
};

export default async function PostPurchaseFlowsSetupPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [sub, settings, install] = await Promise.all([
    prisma.storeSubscription.findUnique({
      where: { storeId: store.id },
      include: { plan: true },
    }),
    getPostPurchaseSettings(store.id),
    prisma.installedApp.findUnique({
      where: {
        storeId_appSlug: {
          storeId: store.id,
          appSlug: "post-purchase-flows",
        },
      },
      select: { status: true },
    }),
  ]);

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.postPurchaseFlows);
  const installed = install !== null;

  return (
    <FlowsSetup
      settings={settings}
      planAllows={planAllows}
      installed={installed}
    />
  );
}
