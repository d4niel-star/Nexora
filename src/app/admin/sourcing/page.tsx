import { SourcingPage } from "@/components/admin/sourcing/SourcingPage";
import { getSourcingIntelData } from "@/lib/sourcing/intelligence";
import { getProviderScoreReport } from "@/lib/sourcing/score-queries";
import { checkFeatureAccess } from "@/lib/billing/service";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

export const metadata = {
  title: "Abastecimiento | Nexora",
};

export default async function Sourcing() {
  const storeId = await getAdminStoreId();
  if (!storeId) {
    return <div>Esperando inicialización de cuenta...</div>;
  }

  const gate = await checkFeatureAccess(storeId, "sourcing_advanced");
  if (!gate.allowed) {
    return (
      <div>
        <AdminPageHeader
          eyebrow="Proveedores · sourcing"
          title="Abastecimiento"
          subtitle="Conexiones reales con proveedores y catálogo B2B. Disponible en plan Scale."
        />
        <div className="mx-auto max-w-2xl py-12">
          <UpgradePrompt
            title="Sourcing Predictivo Bloqueado"
            description={gate.reason || "Tu plan no incluye abastecimiento avanzado cross-provider. Actualizá a Scale para predecir stock y conectar integraciones en tiempo real."}
            feature="advanced"
            planCode="scale"
          />
        </div>
      </div>
    );
  }

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
