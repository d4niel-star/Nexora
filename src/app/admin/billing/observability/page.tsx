import { notFound } from "next/navigation";
import { BillingObservabilityPage } from "@/components/admin/billing/BillingObservabilityPage";
import { isCurrentUserOps } from "@/lib/auth/ops";

// H2 — /admin/billing/observability aggregates data across ALL tenants.
// That is ops-only. Without a DB role we gate on NEXORA_OPS_EMAILS. Any
// non-ops session gets a plain 404 so the surface effectively does not
// exist for regular merchants.
export default async function ObservabilityRoute() {
  if (!(await isCurrentUserOps())) {
    notFound();
  }
  return <BillingObservabilityPage />;
}
