import { redirect } from "next/navigation";
import { getStatsOverview, getStatsCommercial, getStatsAudience } from "@/lib/stats/queries";
import { StatsPage } from "@/components/admin/stats/StatsPage";
import { getCurrentStore } from "@/lib/auth/session";

// ─── /admin/stats ──────────────────────────────────────────────────────
// Statistics hub: Resumen · Comercial · Audiencia.
// Session-dependent, must never be statically prerendered.

export const dynamic = "force-dynamic";

const validTabs = ["panel", "clientes"] as const;
type Tab = (typeof validTabs)[number];

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function StatsRoute({ searchParams }: Props) {
  const store = await getCurrentStore();
  if (!store) redirect("/login");

  const params = await searchParams;
  const tab = validTabs.includes(params.tab as Tab) ? (params.tab as Tab) : "panel";

  const [overview, commercial, audience] = await Promise.all([
    getStatsOverview(),
    getStatsCommercial(),
    getStatsAudience(),
  ]);

  return <StatsPage overview={overview} commercial={commercial} audience={audience} initialTab={tab} />;
}