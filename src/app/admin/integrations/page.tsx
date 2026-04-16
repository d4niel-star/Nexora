import { getUnifiedConnections } from "@/lib/integrations/queries";
import { getHealthCenterData } from "@/lib/integrations/health";
import { IntegrationsClient } from "@/components/admin/integrations/IntegrationsClient";

export default async function AdminIntegrationsPage() {
  const [connections, healthData] = await Promise.all([
    getUnifiedConnections(),
    getHealthCenterData(),
  ]);
  return <IntegrationsClient initialData={connections} healthData={healthData} />;
}
