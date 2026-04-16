import { getAdminInventory } from "@/lib/store-engine/inventory/queries";
import { getVariantIntelligenceReport } from "@/lib/replenishment/variant-queries";
import { getVariantEconomicsReport } from "@/lib/profitability/variant-queries";
import { InventoryClient } from "@/components/admin/inventory/InventoryClient";

export default async function InventoryPage({ searchParams }: { searchParams?: Promise<{ variant?: string; action?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const [items, variantEcon] = await Promise.all([
    getAdminInventory(),
    getVariantEconomicsReport(),
  ]);
  // Pass economics into variant intelligence so UI gets merged risk+economics
  const variantIntel = await getVariantIntelligenceReport(undefined, variantEcon);

  return <InventoryClient items={items} variantIntel={variantIntel} focusVariantId={params?.variant} focusAction={params?.action} />;
}
