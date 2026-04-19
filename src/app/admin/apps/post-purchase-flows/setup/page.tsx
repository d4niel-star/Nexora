import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { getPostPurchaseSettings } from "@/lib/apps/post-purchase-flows/settings";
import { getAppEmailMetrics } from "@/lib/apps/_shared/metrics";
import { FlowsSetup } from "@/components/admin/apps/post-purchase-flows/FlowsSetup";
import { AppMetricsCard } from "@/components/admin/apps/_shared/AppMetricsCard";

export const metadata = {
  title: "Post-purchase flows · Setup",
};

export default async function PostPurchaseFlowsSetupPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [sub, settings, install, metrics] = await Promise.all([
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
    // Events for this app are logged into EmailLog via sendEmailEvent in
    // the review-request cron. See src/app/api/cron/post-purchase-review-
    // requests/route.ts.
    getAppEmailMetrics(store.id, "POST_PURCHASE_REVIEW_REQUEST"),
  ]);

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.postPurchaseFlows);
  const installed = install !== null;
  const installStatus = (install?.status ?? null) as
    | "active"
    | "needs_setup"
    | "disabled"
    | null;

  return (
    <div className="space-y-6">
      <FlowsSetup
        settings={settings}
        planAllows={planAllows}
        installed={installed}
        installStatus={installStatus}
      />
      <AppMetricsCard
        title="Actividad del flow post-entrega"
        sentCaveat="“Envíos” cuenta mails aceptados por el proveedor de email configurado (ver /admin/integrations)."
        metrics={metrics}
      />
    </div>
  );
}
