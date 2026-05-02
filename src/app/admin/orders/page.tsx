import { getAdminOrdersPage } from "@/lib/store-engine/orders/queries";
import { parsePositiveInt, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};

  const result = await getAdminOrdersPage({
    page: parsePositiveInt(params.page, 1),
    pageSize: parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE),
    query: params.q,
    status: params.status,
    paymentStatus: params.paymentStatus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  return (
    <OrdersClient
      orders={result.orders}
      pagination={result.pagination}
      counts={result.counts}
    />
  );
}
