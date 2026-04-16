import { getActivationState } from "@/lib/onboarding/actions"
import { OnboardingDashboard } from "@/components/admin/onboarding/OnboardingDashboard"
import { CommandCenter } from "@/components/admin/dashboard/CommandCenter"
import { getCommandCenterData } from "@/lib/ai/command-queries"

export default async function DashboardPage() {
  const activation = await getActivationState();

  if (activation && !activation.isActivated) {
    return <OnboardingDashboard data={activation} />;
  }

  const data = await getCommandCenterData();

  return <CommandCenter data={data} />;
}
