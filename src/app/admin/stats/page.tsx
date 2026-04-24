import { redirect } from "next/navigation";
import { getStatsOverview, getStatsCommercial, getStatsAudience } from "@/lib/stats/queries";
import { StatsPage } from "@/components/admin/stats/StatsPage";
import { getCurrentStore } from "@/lib/auth/session";

// ─── /admin/stats — Rendimiento ───────────────────────────────────────
//
// Analytical surface inside the Estadísticas family. URL stays at
// /admin/stats so deep links keep working; the sidebar label is now
// "Rendimiento". Session-dependent, never statically prerendered.

export const dynamic = "force-dynamic";

const validTabs = ["panel", "clientes"] as const;
type Tab = (typeof validTabs)[number];

interface Props {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}

export default async function StatsRoute({ searchParams }: Props) {
  const store = await getCurrentStore();
  if (!store) redirect("/login");

  const params = await searchParams;
  const tab = validTabs.includes(params.tab as Tab) ? (params.tab as Tab) : "panel";

  const [overview, commercial, audience] = await Promise.all([
    getStatsOverview({ from: params.from, to: params.to }),
    getStatsCommercial({ from: params.from, to: params.to }),
    getStatsAudience(),
  ]);

  return <StatsPage overview={overview} commercial={commercial} audience={audience} initialTab={tab} />;
}
