import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { getPublicWhatsappSettings } from "@/lib/apps/whatsapp-recovery/settings";
import { WhatsappSetupForm } from "@/components/admin/apps/whatsapp-recovery/WhatsappSetupForm";

export const metadata = {
  title: "WhatsApp Recovery · Setup",
};

export default async function WhatsappRecoverySetupPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [settings, sub] = await Promise.all([
    getPublicWhatsappSettings(store.id),
    prisma.storeSubscription.findUnique({
      where: { storeId: store.id },
      include: { plan: true },
    }),
  ]);

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.whatsappRecovery);

  return <WhatsappSetupForm settings={settings} planAllows={planAllows} />;
}
