import { redirect } from "next/navigation";
import { getStatsOverview, getStatsCommercial } from "@/lib/stats/queries";
import { StatsPage } from "@/components/admin/stats/StatsPage";
import { getCurrentStore } from "@/lib/auth/session";

// ─── /admin/stats — Rendimiento ───────────────────────────────────────
//
// Analytical surface inside the Estadísticas family. URL stays at
// /admin/stats so deep links keep working; the sidebar label is
// "Rendimiento". Session-dependent, never statically prerendered.
//
// The page is single-stream (no internal tabs). Audience analysis lives
// in /admin/customers and conversion analysis in /admin/conversion, so
// the audience query previously prefetched here was removed — it was
// dead weight under the new IA.

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function StatsRoute({ searchParams }: Props) {
  const store = await getCurrentStore();
  if (!store) redirect("/login");

  const params = await searchParams;

  const [overview, commercial] = await Promise.all([
    getStatsOverview({ from: params.from, to: params.to }),
    getStatsCommercial({ from: params.from, to: params.to }),
  ]);

  return <StatsPage overview={overview} commercial={commercial} />;
}
