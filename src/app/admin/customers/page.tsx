import { getAggregatedCustomers } from "@/lib/customers/queries";
import { CustomersClient } from "@/components/admin/customers/CustomersClient";

export default async function AdminCustomersPage() {
  const aggregated = await getAggregatedCustomers();
  
  return <CustomersClient initialCustomers={aggregated} />;
}
