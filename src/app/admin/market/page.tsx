import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { getMarketToolsSnapshot } from "@/lib/tools/queries";
import { MarketToolsHub } from "@/components/admin/market/MarketToolsHub";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market · Herramientas — Nexora",
};

export default async function MarketPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/home/login");

  const snapshot = await getMarketToolsSnapshot(store.id);
  return <MarketToolsHub snapshot={snapshot} />;
}
