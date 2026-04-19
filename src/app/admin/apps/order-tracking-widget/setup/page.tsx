import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { storePath } from "@/lib/store-engine/urls";
import { getTrackingStats } from "@/lib/apps/order-tracking-widget/queries";
import { TrackingSetup } from "@/components/admin/apps/order-tracking-widget/TrackingSetup";

export const metadata = {
  title: "Seguimiento de pedidos · Setup",
};

export default async function OrderTrackingSetupPage() {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const [install, stats] = await Promise.all([
    prisma.installedApp.findUnique({
      where: {
        storeId_appSlug: {
          storeId: store.id,
          appSlug: "order-tracking-widget",
        },
      },
      select: { status: true },
    }),
    getTrackingStats(store.id),
  ]);

  const isActive = install?.status === "active";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .replace(/\/$/, "");
  const publicUrl = `${appUrl}${storePath(store.slug, "/tracking")}`;

  return (
    <TrackingSetup isActive={isActive} publicUrl={publicUrl} stats={stats} />
  );
}
