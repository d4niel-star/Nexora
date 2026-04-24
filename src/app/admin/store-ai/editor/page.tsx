import { unstable_noStore as noStore } from "next/cache";

import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";
import { ThemeEditorShell } from "@/components/admin/store-ai/ThemeEditorShell";
import { checkAIBuilderAccess } from "@/lib/billing/service";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { getAdminStoreInitialData } from "@/lib/store-engine/queries";
import { getCurrentUser } from "@/lib/auth/session";

// ─── Theme Editor — dedicated editing surface ────────────────────────────
// This page owns the full visual editing experience: sidebar settings,
// live iframe preview with desktop/mobile toggle, and the free-form
// Nexora IA copilot.  It replaces the scattered Tema/Branding/Home/Preview
// tabs that previously lived inside "Mi tienda".

export const dynamic = "force-dynamic";

export default async function ThemeEditorPage() {
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
          title="Editor de temas bloqueado"
          description={
            gate.reason ||
            "Tu plan actual no incluye acceso al editor de temas. Actualizá para personalizar tu storefront."
          }
          feature="advanced"
          planCode={gate.upgradeSuggestion}
        />
      </div>
    );
  }

  const initialData = await getAdminStoreInitialData();
  const user = await getCurrentUser();
  const memoryScope =
    storeId && user?.id ? { storeId, userId: user.id } : undefined;

  return <ThemeEditorShell initialData={initialData} memoryScope={memoryScope} />;
}
