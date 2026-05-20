import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { getRevenueIntelligence } from "@/lib/dashboard/revenue-intelligence";
import { getInventoryIntelligence } from "@/lib/dashboard/inventory-intelligence";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Truck,
  BarChart3,
  Archive,
  RefreshCcw,
} from "lucide-react";

export default async function IntelligencePage() {
  const store = await getActiveStoreInfo();
  const [revenue, inventory] = await Promise.all([
    getRevenueIntelligence(store.id),
    getInventoryIntelligence(store.id),
  ]);

  const fmt = (n: number) => formatCurrency(n);
  const pctClass = (n: number | null) =>
    n === null ? "text-ink-5" : n >= 0 ? "text-[color:var(--signal-success)]" : "text-[color:var(--signal-danger)]";
  const pctLabel = (n: number | null) =>
    n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
          Commerce Intelligence
        </h1>
        <p className="mt-1 text-[13px] text-ink-5">
          Métricas reales de los últimos 30 días
        </p>
      </div>

      {/* Revenue KPIs */}
      <section>
        <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
          Revenue
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KPI icon={DollarSign} label="Ingresos 30d" value={fmt(revenue.totalRevenue30d)} sub={pctLabel(revenue.revenueGrowthPct)} subClass={pctClass(revenue.revenueGrowthPct)} />
          <KPI icon={ShoppingCart} label="Pedidos 30d" value={String(revenue.totalOrders30d)} sub={pctLabel(revenue.orderGrowthPct)} subClass={pctClass(revenue.orderGrowthPct)} />
          <KPI icon={BarChart3} label="Ticket promedio" value={fmt(revenue.avgOrderValue)} />
          <KPI icon={RefreshCcw} label="Reembolsos" value={fmt(revenue.refundTotal30d)} sub={`${revenue.refundCount30d} pedidos`} subClass="text-ink-5" />
          <KPI icon={Truck} label="Sin despachar" value={String(revenue.pendingFulfillment)} sub={revenue.avgFulfillmentDays ? `${revenue.avgFulfillmentDays.toFixed(1)}d promedio` : "—"} subClass="text-ink-5" />
          <KPI icon={TrendingUp} label="Crecimiento" value={pctLabel(revenue.revenueGrowthPct)} subClass={pctClass(revenue.revenueGrowthPct)} />
        </div>
      </section>

      {/* Top Products */}
      {revenue.topProducts.length > 0 && (
        <section>
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
            Top Productos (por ingreso)
          </h2>
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                  <th className="px-4 py-3 text-left font-medium text-ink-5">Producto</th>
                  <th className="px-4 py-3 text-right font-medium text-ink-5">Unidades</th>
                  <th className="px-4 py-3 text-right font-medium text-ink-5">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--hairline)]">
                {revenue.topProducts.map((p, i) => (
                  <tr key={p.id} className="transition-colors hover:bg-[var(--surface-1)]">
                    <td className="px-4 py-3 font-medium text-ink-0">{p.title}</td>
                    <td className="px-4 py-3 text-right tabular text-ink-4">{p.unitsSold}</td>
                    <td className="px-4 py-3 text-right tabular font-medium text-ink-0">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Inventory Intelligence */}
      <section>
        <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
          Inventario
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPI icon={Package} label="SKUs publicados" value={String(inventory.totalSKUs)} />
          <KPI icon={AlertTriangle} label="Sin stock" value={String(inventory.outOfStock)} subClass="text-[color:var(--signal-danger)]" />
          <KPI icon={AlertTriangle} label="Stock crítico" value={String(inventory.criticalStock)} sub="<7 días" subClass="text-[color:var(--signal-warning)]" />
          <KPI icon={Package} label="Saludable" value={String(inventory.healthyStock)} subClass="text-[color:var(--signal-success)]" />
        </div>
      </section>

      {/* Inventory Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {inventory.topMovers.length > 0 && (
          <section>
            <h3 className="mb-3 text-[12px] font-semibold text-ink-3">Top movers</h3>
            <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                    <th className="px-3 py-2 text-left font-medium text-ink-5">Producto</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-5">Stock</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-5">Ventas/día</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-5">Días rest.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--hairline)]">
                  {inventory.topMovers.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-ink-0 truncate max-w-[160px]">{item.title}</td>
                      <td className="px-3 py-2 text-right tabular text-ink-4">{item.stock}</td>
                      <td className="px-3 py-2 text-right tabular text-ink-4">{item.avgDailySales}</td>
                      <td className={`px-3 py-2 text-right tabular font-medium ${item.risk === "critical" ? "text-[color:var(--signal-danger)]" : item.risk === "warning" ? "text-[color:var(--signal-warning)]" : "text-ink-4"}`}>
                        {item.daysRemaining ?? "∞"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {inventory.deadInventory.length > 0 && (
          <section>
            <h3 className="mb-3 text-[12px] font-semibold text-ink-3">Inventario muerto (0 ventas en 30d)</h3>
            <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                    <th className="px-3 py-2 text-left font-medium text-ink-5">Producto</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-5">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--hairline)]">
                  {inventory.deadInventory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-ink-0 truncate max-w-[200px]">{item.title}</td>
                      <td className="px-3 py-2 text-right tabular text-ink-4">{item.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── KPI Cell ───
function KPI({
  icon: Icon,
  label,
  value,
  sub,
  subClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-ink-5" />
        <span className="text-[11px] font-medium text-ink-5">{label}</span>
      </div>
      <p className="mt-2 text-[18px] font-semibold tabular tracking-[-0.02em] text-ink-0">
        {value}
      </p>
      {sub && (
        <p className={`mt-0.5 text-[11px] ${subClass || "text-ink-5"}`}>{sub}</p>
      )}
    </div>
  );
}
