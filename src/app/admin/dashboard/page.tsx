import { CommandCenter } from "@/components/admin/dashboard/CommandCenter"
import { getCommandCenterData } from "@/lib/ai/command-queries"

export default async function DashboardPage() {
  const data = await getCommandCenterData();

  return <CommandCenter data={data} />;
}
