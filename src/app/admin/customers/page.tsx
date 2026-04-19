import { getAggregatedCustomers } from "@/lib/customers/queries";
import { CustomersClient } from "@/components/admin/customers/CustomersClient";

// Admin surface with tenant-scoped data that depends on session state.
// Must never be statically prerendered — without a session the client
// component crashes at build time.
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const aggregated = await getAggregatedCustomers();
  
  return <CustomersClient initialCustomers={aggregated} />;
}
