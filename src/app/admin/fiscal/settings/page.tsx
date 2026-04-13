import { getDefaultStore } from "@/lib/store-engine/queries";
import { getStoreFiscalProfileAction, getStoreLegalSettingsAction } from "@/lib/fiscal/arca/actions";
import { LegalSettingsForm } from "@/components/admin/fiscal/LegalSettingsForm";

export default async function LegalFiscalSettingsPage() {
  const store = await getDefaultStore();
  if (!store) {
    return <div className="p-10 font-bold text-center">Store not found</div>;
  }

  const [profile, settings] = await Promise.all([
     getStoreFiscalProfileAction(store.id),
     getStoreLegalSettingsAction(store.id)
  ]);

  return (
    <LegalSettingsForm 
      storeId={store.id} 
      initialProfile={profile} 
      initialSettings={settings} 
    />
  );
}
