import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { getPublicWhatsappSettings } from "@/lib/apps/whatsapp-recovery/settings";
import { getAppEmailMetrics } from "@/lib/apps/_shared/metrics";
import { WhatsappSetupForm } from "@/components/admin/apps/whatsapp-recovery/WhatsappSetupForm";
import { AppMetricsCard } from "@/components/admin/apps/_shared/AppMetricsCard";

export const metadata = {
  title: "WhatsApp Recovery · Setup",
};

export default async function WhatsappRecoverySetupPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [settings, sub, metrics] = await Promise.all([
    getPublicWhatsappSettings(store.id),
    prisma.storeSubscription.findUnique({
      where: { storeId: store.id },
      include: { plan: true },
    }),
    // Events for this app are logged into EmailLog with the canonical
    // eventType used by the cron (src/lib/apps/whatsapp-recovery/cron.ts).
    getAppEmailMetrics(store.id, "ABANDONED_CART_WHATSAPP"),
  ]);

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.whatsappRecovery);

  return (
    <div className="space-y-6">
      <WhatsappSetupForm settings={settings} planAllows={planAllows} />
      <AppMetricsCard
        title="Actividad de WhatsApp Recovery"
        sentCaveat="“Envíos” cuenta mensajes aceptados por la API oficial de Meta Cloud (WABA)."
        metrics={metrics}
      />
    </div>
  );
}
