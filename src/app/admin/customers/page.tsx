import { getAggregatedCustomers } from "@/lib/customers/queries";
import { CustomersClient } from "@/components/admin/customers/CustomersClient";
import { getCustomerInsights } from "@/lib/customers/insights-queries";

// Admin surface with tenant-scoped data that depends on session state.
// Must never be statically prerendered — without a session the client
// component crashes at build time.
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [aggregated, insights] = await Promise.all([
    getAggregatedCustomers(),
    getCustomerInsights(),
  ]);
  
  return <CustomersClient initialCustomers={aggregated} insights={insights} />;
}
