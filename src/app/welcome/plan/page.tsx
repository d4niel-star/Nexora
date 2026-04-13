import { PlanSelectionClient } from "@/components/onboarding-commercial/PlanSelectionClient";
import { resolvePostAuthDestination } from "@/lib/onboarding-commercial/actions";
import { redirect } from "next/navigation";

export default async function PlanSelectionPage() {
  const { destination, reason } = await resolvePostAuthDestination();
  
  // If they are allowed to be in Plan Selection, reason === "no_plan"
  if (reason !== "no_plan") {
    redirect(destination);
  }

  return <PlanSelectionClient />;
}
