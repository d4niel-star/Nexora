import { getAdminOrders } from "@/lib/store-engine/orders/queries";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage() {
  const orders = await getAdminOrders();

  return <OrdersClient orders={orders} />;
}
