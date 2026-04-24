import { getCurrentStore } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getCommunicationSettings } from "@/lib/communication/queries";
import { CommunicationPage } from "@/components/admin/communication/CommunicationPage";

export default async function AdminCommunicationPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/home/login");

  const settings = await getCommunicationSettings(store.id);

  return <CommunicationPage initialSettings={settings} />;
}
