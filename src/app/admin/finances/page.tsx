import { FinancesPage } from "@/components/admin/finances/FinancesPage";
import { getAdminFinanceData } from "@/lib/finances/queries";
import { getProfitabilityReport } from "@/lib/profitability/queries";

const validTabs = [
  "resumen",
  "cobrado",
  "pendiente",
  "reembolsos",
  "comisiones",
  "margenes",
  "rentabilidad",
  "exportaciones",
] as const;

type FinanceTabValue = (typeof validTabs)[number];

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function FinancesRoute({ searchParams }: Props) {
  const params = await searchParams;
  const initialTab = validTabs.includes(params.tab as FinanceTabValue)
    ? (params.tab as FinanceTabValue)
    : "resumen";

  const [data, profitabilityReport] = await Promise.all([
    getAdminFinanceData(),
    getProfitabilityReport(),
  ]);

  return (
    <FinancesPage
      initialData={data}
      profitabilityReport={profitabilityReport}
      initialTab={initialTab}
    />
  );
}
