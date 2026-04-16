import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { getAdminOrders } from "@/lib/store-engine/orders/queries";
import { PackageCheck } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import OrdersClient from "@/app/admin/orders/OrdersClient";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AIOperationsPage({ searchParams }: Props) {
  noStore();
  const orders = await getAdminOrders();
  const params = await searchParams;

  const validTabs = ["all", "new", "processing", "shipped", "cancelled"] as const;
  const tab = validTabs.includes(params.tab as any) ? (params.tab as any) : "all";

  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell
        contextName="Operación & Fulfillment"
        contextIcon={<PackageCheck className="w-5 h-5 text-[#111111]" />}
      >
        <OrdersClient orders={orders} hideHeader initialTab={tab} />
      </NexoraAIShell>
    </div>
  );
}
