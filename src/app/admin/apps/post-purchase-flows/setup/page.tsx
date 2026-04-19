import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { getPostPurchaseSettings } from "@/lib/apps/post-purchase-flows/settings";
import { getAppEmailMetrics } from "@/lib/apps/_shared/metrics";
import { FlowsSetup } from "@/components/admin/apps/post-purchase-flows/FlowsSetup";
import { AppMetricsCard } from "@/components/admin/apps/_shared/AppMetricsCard";
import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";

export const metadata = {
  title: "Post-purchase flows · Setup",
};

export default async function PostPurchaseFlowsSetupPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [sub, settings, install, reviewMetrics, reorderMetrics] =
    await Promise.all([
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
      // V3.3: CTA wrapped with buildTrackedUrl, so we opt in to click
      // stats for the review-request flow.
      getAppEmailMetrics(store.id, "POST_PURCHASE_REVIEW_REQUEST", {
        trackClicks: true,
      }),
      // V3.4: same wrapping pattern for the reorder-followup flow. Each
      // eventType has its own set of EmailLog rows so metrics stay clean.
      getAppEmailMetrics(store.id, "POST_PURCHASE_REORDER_FOLLOWUP", {
        trackClicks: true,
      }),
    ]);

  const planConfig =
    sub?.plan && (sub.status === "active" || sub.status === "trialing")
      ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config ?? null
      : null;
  const planAllows = Boolean(planConfig?.postPurchaseFlows);
  const installed = install !== null;
  const installStatus = (install?.status ?? null) as
    | "active"
    | "needs_setup"
    | "disabled"
    | null;

  if (!planAllows) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-6">
        <UpgradePrompt
          title="Flujos Post-Compra Bloqueados"
          description="Tu plan actual no incluye automatizaciones post-compra. Actualizá a Growth para cerrar el círculo comercial, pedir reseñas y fomentar la recompra."
          feature="advanced"
          planCode="growth"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FlowsSetup
        settings={settings}
        planAllows={planAllows}
        installed={installed}
        installStatus={installStatus}
      />
      <AppMetricsCard
        title="Actividad · Pedido de reseña"
        sentCaveat="“Envíos” cuenta mails aceptados por el proveedor de email configurado (ver /admin/integrations)."
        metrics={reviewMetrics}
      />
      <AppMetricsCard
        title="Actividad · Recordatorio de recompra"
        sentCaveat="“Envíos” cuenta mails aceptados por el proveedor de email configurado (ver /admin/integrations)."
        metrics={reorderMetrics}
      />
    </div>
  );
}
