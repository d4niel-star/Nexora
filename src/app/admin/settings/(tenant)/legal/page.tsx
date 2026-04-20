import { getDefaultStore } from "@/lib/store-engine/queries";
import {
  getStoreFiscalProfileAction,
  getStoreLegalSettingsAction,
} from "@/lib/fiscal/arca/actions";
import { LegalSettingsForm } from "@/components/admin/fiscal/LegalSettingsForm";

// ─── Settings · Legal y ARCA ────────────────────────────────────────────
//
// Inlines the existing `LegalSettingsForm` used by /admin/fiscal/settings.
// The form itself is already self-contained (takes storeId + initial
// data, issues server actions for save), so we reuse it verbatim and
// avoid shipping a duplicate form. The Settings shell provides the
// right-side category nav; the form renders in the main column.

export const dynamic = "force-dynamic";

export default async function SettingsLegalPage() {
  const store = await getDefaultStore();
  if (!store) {
    return (
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-6 text-[13px] text-ink-5">
        No se encontró una tienda activa para editar su perfil fiscal.
      </div>
    );
  }

  const [profile, settings] = await Promise.all([
    getStoreFiscalProfileAction(store.id),
    getStoreLegalSettingsAction(store.id),
  ]);

  return (
    <LegalSettingsForm
      storeId={store.id}
      initialProfile={profile}
      initialSettings={settings}
    />
  );
}
