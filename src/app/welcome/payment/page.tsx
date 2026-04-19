import { redirect } from "next/navigation";
import { PaymentSummaryClient } from "@/components/onboarding-commercial/PaymentSummaryClient";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { resolvePostAuthDestination } from "@/lib/onboarding-commercial/actions";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { destination, reason } = await resolvePostAuthDestination();

  // Protect route
  if (reason !== "no_plan") {
    redirect(destination);
  }

  const params = await searchParams;
  const planCode = params.plan;
  if (!planCode) {
    redirect("/welcome/plan");
  }

  const planInfo = PLAN_DEFINITIONS.find((p) => p.code === planCode);
  if (!planInfo) {
    redirect("/welcome/plan");
  }

  return <PaymentSummaryClient planInfo={planInfo} />;
}
