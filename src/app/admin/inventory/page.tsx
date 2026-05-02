import { getAdminInventory } from "@/lib/store-engine/inventory/queries";
import { getVariantIntelligenceReport } from "@/lib/replenishment/variant-queries";
import { getVariantEconomicsReport } from "@/lib/profitability/variant-queries";
import { getStockMovementHistory } from "@/lib/store-engine/inventory/movement-queries";
import { InventoryClient } from "@/components/admin/inventory/InventoryClient";
import { StockMovementTable } from "@/components/admin/inventory/StockMovementTable";

export default async function InventoryPage({ searchParams }: { searchParams?: Promise<{ variant?: string; action?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const [items, variantEcon, movementResult] = await Promise.all([
    getAdminInventory(),
    getVariantEconomicsReport(),
    getStockMovementHistory({ page: 1, pageSize: 25 }),
  ]);
  // Pass economics into variant intelligence so UI gets merged risk+economics
  const variantIntel = await getVariantIntelligenceReport(undefined, variantEcon);

  return (
    <div className="space-y-8">
      <InventoryClient items={items} variantIntel={variantIntel} focusVariantId={params?.variant} focusAction={params?.action} />
      <div className="px-6 pb-8">
        <StockMovementTable movements={movementResult.movements} total={movementResult.total} />
      </div>
    </div>
  );
}
