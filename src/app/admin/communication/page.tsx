import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/auth/session";
import { getCommunicationSettings } from "@/lib/communication/queries";
import { CommunicationPage } from "@/components/admin/communication/CommunicationPage";

export const dynamic = "force-dynamic";

export default async function AdminCommunicationPage() {
  // Defensive: any unexpected failure in session resolution should redirect to
  // login rather than 500 the route. The admin layout already runs the same
  // check, so a redirect loop is impossible — if the session truly cannot be
  // read the user is already at /home/login by the time this catch fires.
  let storeId: string | null = null;
  try {
    const store = await getCurrentStore();
    storeId = store?.id ?? null;
  } catch (error) {
    console.error("[Communication] getCurrentStore threw:", error);
  }

  if (!storeId) redirect("/home/login");

  const settings = await getCommunicationSettings(storeId);
  return <CommunicationPage initialSettings={settings} />;
}
