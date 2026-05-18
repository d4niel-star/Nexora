import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/auth/session";
import { getAutomationDashboard } from "@/lib/automations/queries";
import { AutomationsClient } from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/admin/dashboard");

  const data = await getAutomationDashboard();

  return <AutomationsClient data={data} />;
}
