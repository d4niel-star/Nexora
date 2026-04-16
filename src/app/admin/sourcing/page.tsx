import { SourcingPage } from "@/components/admin/sourcing/SourcingPage";
import { getSourcingIntelData } from "@/lib/sourcing/intelligence";
import { getProviderScoreReport } from "@/lib/sourcing/score-queries";

export const metadata = {
  title: "Abastecimiento | Nexora",
};

export default async function Sourcing() {
  const [intelData, scoreReport] = await Promise.all([
    getSourcingIntelData(),
    getProviderScoreReport(),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <SourcingPage intelData={intelData} scoreReport={scoreReport} />
    </div>
  );
}
