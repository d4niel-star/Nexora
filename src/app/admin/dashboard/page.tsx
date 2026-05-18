import { CommandCenter } from "@/components/admin/dashboard/CommandCenter"
import { MerchantCockpit } from "@/components/admin/dashboard/MerchantCockpit"
import { getCommandCenterData } from "@/lib/ai/command-queries"
import { getMerchantCockpitData } from "@/lib/dashboard/cockpit-queries"

export default async function DashboardPage() {
  const [data, cockpitData] = await Promise.all([
    getCommandCenterData(),
    getMerchantCockpitData(),
  ]);

  return (
    <div className="space-y-8">
      <MerchantCockpit data={cockpitData} />
      <CommandCenter data={data} />
    </div>
  );
}
