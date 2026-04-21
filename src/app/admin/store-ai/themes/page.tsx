import { unstable_noStore as noStore } from "next/cache";

import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";
import { ThemeGalleryPage } from "@/components/admin/themes/ThemeGalleryPage";
import { checkAIBuilderAccess } from "@/lib/billing/service";
import { getAdminStoreId } from "@/lib/store-engine/actions";

// ─── Themes Gallery — dedicated route ───────────────────────────────────
// /admin/store-ai/themes — a separate page for exploring and applying
// themes, kept outside the main Tienda IA landing to avoid visual noise.

export default async function ThemesPage() {
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
          title="Acceso bloqueado por plan"
          description={
            gate.reason ||
            "Tu plan actual no incluye acceso a la galería de temas."
          }
          feature="advanced"
          planCode={gate.upgradeSuggestion}
        />
      </div>
    );
  }

  const { getCurrentThemeState, listBuiltInTemplates } = await import(
    "@/lib/themes/queries"
  );

  const [themeState, templates] = await Promise.all([
    getCurrentThemeState(storeId),
    Promise.resolve(listBuiltInTemplates()),
  ]);

  const currentThemeView = {
    themeStyle: themeState.themeStyle,
    appliedTemplate: themeState.appliedTemplate
      ? {
          id: themeState.appliedTemplate.id,
          name: themeState.appliedTemplate.name,
          themeStyle: themeState.appliedTemplate.themeStyle,
        }
      : null,
    primaryColor: themeState.primaryColor,
    secondaryColor: themeState.secondaryColor,
    fontFamily: themeState.fontFamily,
    blocks: themeState.blocks,
  };

  return (
    <ThemeGalleryPage current={currentThemeView} templates={templates} />
  );
}
