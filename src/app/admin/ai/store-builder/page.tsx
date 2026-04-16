import { AIStoreBuilderPage } from "@/components/admin/ai-store-builder/AIStoreBuilderPage";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { getAIGenerationDraft } from "@/lib/store-engine/ai-builder/queries";
import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { Sparkles } from "lucide-react";

export default async function Page() {
  const storeId = await getAdminStoreId();
  if (!storeId) {
    return <div>Esperando inicialización de cuenta...</div>;
  }
  
  const draft = await getAIGenerationDraft(storeId);
  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell contextName="Tienda IA" contextIcon={<Sparkles className="w-5 h-5 text-[#111111]" />}>
        <div className="max-w-7xl mx-auto pt-6 px-4">
          <AIStoreBuilderPage initialDraft={draft} />
        </div>
      </NexoraAIShell>
    </div>
  );
}
