import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { getAdminOrdersPage } from "@/lib/store-engine/orders/queries";
import { PackageCheck } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import OrdersClient from "@/app/admin/orders/OrdersClient";

interface Props {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; status?: string }>;
}

export default async function AIOperationsPage({ searchParams }: Props) {
  noStore();
  const params = await searchParams;

  const result = await getAdminOrdersPage({
    page: params.page ? parseInt(params.page, 10) : 1,
    status: params.status ?? params.tab,
    query: params.q,
  });

  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell
        contextName="Operación & Fulfillment"
        contextIcon={<PackageCheck className="w-5 h-5 text-ink-0" />}
      >
        <OrdersClient orders={result.orders} pagination={result.pagination} counts={result.counts} hideHeader />
      </NexoraAIShell>
    </div>
  );
}
