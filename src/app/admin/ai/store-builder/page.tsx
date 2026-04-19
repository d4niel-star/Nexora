import { AIStoreBuilderPage } from "@/components/admin/ai-store-builder/AIStoreBuilderPage";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { getAIGenerationDraft } from "@/lib/store-engine/ai-builder/queries";
import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { Sparkles } from "lucide-react";
import { checkAIBuilderAccess } from "@/lib/billing/service";
import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";

export default async function Page() {
  const storeId = await getAdminStoreId();
  if (!storeId) {
    return <div>Esperando inicialización de cuenta...</div>;
  }
  
  const gate = await checkAIBuilderAccess(storeId);
  if (!gate.allowed) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-6">
        <UpgradePrompt
          title="Funcionalidad bloqueada por plan"
          description={gate.reason || "Tu plan actual no incluye acceso al Constructor IA. Actualizá para automatizar el diseño y contenido de tu tienda."}
          feature="advanced"
          planCode={gate.upgradeSuggestion}
        />
      </div>
    );
  }

  const draft = await getAIGenerationDraft(storeId);
  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell contextName="Tienda IA" contextIcon={<Sparkles className="w-5 h-5 text-ink-0" />}>
        <div className="max-w-7xl mx-auto pt-6 px-4">
          <AIStoreBuilderPage initialDraft={draft} />
        </div>
      </NexoraAIShell>
    </div>
  );
}
