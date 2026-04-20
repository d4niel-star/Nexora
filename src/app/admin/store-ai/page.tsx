import { unstable_noStore as noStore } from "next/cache";

import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";
import { StoreAIModule } from "@/components/admin/store-ai/StoreAIModule";
import { checkAIBuilderAccess } from "@/lib/billing/service";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { getAIGenerationDraft } from "@/lib/store-engine/ai-builder/queries";

// ─── Tienda IA — top-level module page ───────────────────────────────────
// Dedicated route and shell (NOT wrapped in NexoraAIShell). Sits at the
// same hierarchy as Catálogo, Inventario, Abastecimiento, Operaciones,
// Apps. The heavy lifting happens inside <StoreAIModule> — this file
// only owns auth, billing gating and the initial draft fetch.

export default async function StoreAIPage() {
  noStore();
  const storeId = await getAdminStoreId();
  if (!storeId) {
    return (
      <div className="py-12 text-center text-[13px] text-ink-5">
        Esperando inicialización de cuenta…
      </div>
    );
  }

  const gate = await checkAIBuilderAccess(storeId);
  if (!gate.allowed) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-6">
        <UpgradePrompt
          title="Tienda IA bloqueada por plan"
          description={
            gate.reason ||
            "Tu plan actual no incluye acceso al constructor de Tienda IA. Actualizá para automatizar el diseño y el contenido de tu tienda con inteligencia artificial."
          }
          feature="advanced"
          planCode={gate.upgradeSuggestion}
        />
      </div>
    );
  }

  const draft = await getAIGenerationDraft(storeId);

  return <StoreAIModule initialDraft={draft} />;
}
