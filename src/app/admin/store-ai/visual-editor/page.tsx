import { unstable_noStore as noStore } from "next/cache";

import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";
import { VisualEditorPro } from "@/components/admin/editor-pro/VisualEditorPro";
import { checkAIBuilderAccess } from "@/lib/billing/service";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { getAdminStoreInitialData } from "@/lib/store-engine/queries";

// ─── Visual Editor Pro — dedicated full-screen editing surface ───────────────
// Professional 3-panel editor: Structure | Canvas | Inspector
// Replaces the legacy ThemeEditorShell for section editing.

export const dynamic = "force-dynamic";

export default async function VisualEditorPage() {
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
          title="Editor visual bloqueado"
          description={
            gate.reason ||
            "Tu plan actual no incluye acceso al editor visual. Actualizá para personalizar tu storefront."
          }
          feature="advanced"
          planCode={gate.upgradeSuggestion}
        />
      </div>
    );
  }

  const initialData = await getAdminStoreInitialData();

  return <VisualEditorPro initialData={initialData} />;
}
