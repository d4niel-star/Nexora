import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { FinancesPage } from "@/components/admin/finances/FinancesPage";
import { getAdminFinanceData } from "@/lib/finances/queries";
import { TrendingUp } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AIFinancesPage({ searchParams }: Props) {
  noStore();
  const data = await getAdminFinanceData();
  const params = await searchParams;

  const validTabs = ["resumen", "cobrado", "pendiente", "reembolsos", "comisiones", "margenes", "exportaciones"] as const;
  const tab = validTabs.includes(params.tab as any) ? (params.tab as any) : "resumen";

  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell
        contextName="Finanzas y salud de margen"
        contextIcon={<TrendingUp className="w-5 h-5 text-ink-0" />}
      >
        <FinancesPage initialData={data} hideHeader initialTab={tab} />
      </NexoraAIShell>
    </div>
  );
}
