"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Package,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import type {
  ChannelProfitability,
  CostConfidence,
  FeeDataQuality,
  MarginHealth,
  ProductProfitability,
  ProfitabilityAlert,
  ProfitabilityReport,
} from "@/types/profitability";

type SubView = "overview" | "products" | "channels" | "alerts";

export function ProfitabilityView({ report }: { report: ProfitabilityReport }) {
  const [subView, setSubView] = useState<SubView>("overview");
  const [productSort, setProductSort] = useState<"revenue" | "margin" | "health">("revenue");
  const [productDir, setProductDir] = useState<"asc" | "desc">("desc");

  const summary = report.summary;

  const sortedProducts = useMemo(() => {
    const items = [...report.byProduct];
    items.sort((a, b) => {
      let cmp = 0;
      if (productSort === "revenue") cmp = a.totalRevenue - b.totalRevenue;
      else if (productSort === "margin") cmp = a.netContributionPercent - b.netContributionPercent;
      else cmp = healthRank(a.health) - healthRank(b.health);
      return productDir === "desc" ? -cmp : cmp;
    });
    return items;
  }, [productDir, productSort, report.byProduct]);

  const criticalAlerts = report.alerts.filter((alert) => alert.severity === "critical");
  const warningAlerts = report.alerts.filter((alert) => alert.severity === "warning" || alert.severity === "info");

  const subTabs: Array<{ label: string; value: SubView; count?: number }> = [
    { label: "Resumen", value: "overview" },
    { label: "Por producto", value: "products", count: report.byProduct.length },
    { label: "Por canal", value: "channels", count: report.byChannel.length },
    { label: "Alertas", value: "alerts", count: report.alerts.length },
  ];

  if (summary.ordersAnalyzed === 0) {
    return <EmptyMarginState />;
  }

  return (
    <div className="space-y-6 p-6">
      <ScopeBanner />

      {summary.dataConfidenceScore < 100 ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            summary.dataConfidenceScore < 40
              ? "border-red-200 bg-red-50"
              : summary.dataConfidenceScore < 70
                ? "border-amber-200 bg-amber-50"
                : "border-blue-200 bg-blue-50"
          )}
        >
          <HelpCircle
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              summary.dataConfidenceScore < 40
                ? "text-red-500"
                : summary.dataConfidenceScore < 70
                  ? "text-amber-500"
                  : "text-blue-500"
            )}
          />
          <div>
            <p className="text-sm font-bold text-[#111111]">
              Confianza de datos: {summary.dataConfidenceScore}%
            </p>
            <p className="mt-0.5 text-xs text-[#666666]">
              {summary.productsWithCost} de{" "}
              {summary.productsWithCost + summary.productsWithoutCost} productos vendidos
              tienen costo disponible. Los casos sin costo quedan marcados como
              inciertos.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1 rounded-xl bg-[#F5F5F5] p-1">
        {subTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSubView(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-bold transition-all",
              subView === tab.value
                ? "bg-white text-[#111111] shadow-sm"
                : "text-[#888888] hover:text-[#111111]"
            )}
            type="button"
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  subView === tab.value
                    ? "bg-[#111111] text-white"
                    : "bg-[#EAEAEA] text-[#888888]"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {subView === "overview" ? (
        <OverviewSection
          alerts={criticalAlerts}
          byChannel={report.byChannel}
          summary={summary}
        />
      ) : null}

      {subView === "products" ? (
        <ProductsSection
          dir={productDir}
          onSort={(column) => {
            if (column === productSort) {
              setProductDir((current) => (current === "desc" ? "asc" : "desc"));
              return;
            }

            setProductSort(column);
            setProductDir("desc");
          }}
          products={sortedProducts}
          sort={productSort}
        />
      ) : null}

      {subView === "channels" ? <ChannelsSection channels={report.byChannel} /> : null}

      {subView === "alerts" ? (
        <AlertsSection criticals={criticalAlerts} warnings={warningAlerts} />
      ) : null}
    </div>
  );
}

function ScopeBanner() {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 shadow-sm">
      <p className="text-sm font-bold text-[#111111]">Unit Economics v2</p>
      <p className="mt-1 text-xs leading-relaxed text-[#666666]">
        Contribución neta por SKU y canal. Incluye COGS, fees de pago reales
        (desde la pasarela), fees de canal, y reembolsos. El envío cobrado al
        comprador se muestra aparte — no representa costo logístico del negocio.
      </p>
    </div>
  );
}

function EmptyMarginState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <BarChart3 className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">
        Todavia no hay ordenes cobradas para analizar
      </h3>
      <p className="mt-2 max-w-xl text-[15px] font-medium text-[#888888]">
        La vista se activa cuando existan pagos aprobados, pagados o reembolsos
        registrados con datos de costo y fee disponibles.
      </p>
    </div>
  );
}

function OverviewSection({
  alerts,
  byChannel,
  summary,
}: {
  alerts: ProfitabilityAlert[];
  byChannel: ChannelProfitability[];
  summary: ProfitabilityReport["summary"];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          accent
          label="Ingresos reconocidos"
          sub={`${summary.ordersAnalyzed} ordenes liquidadas`}
          value={formatCurrency(summary.totalRevenue)}
        />
        <KpiCard
          label="Costo de productos"
          sub={
            summary.productsWithoutCost > 0
              ? `${summary.productsWithoutCost} sin costo`
              : "Todos con costo"
          }
          value={formatCurrency(summary.totalCostOfGoods)}
        />
        <KpiCard
          label="Margen bruto"
          positive={summary.grossMargin > 0}
          sub={formatCurrency(summary.grossMargin)}
          value={formatPercent(summary.grossMarginPercent, true)}
        />
        <KpiCard
          health={summary.overallHealth}
          label="Contribución neta"
          positive={summary.netContribution > 0}
          sub={formatCurrency(summary.netContribution)}
          value={formatPercent(summary.netContributionPercent, true)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FeeCard
          label="Fees de pago"
          total={summary.totalNetRevenue}
          value={summary.totalPaymentFees}
        />
        <FeeCard
          label="Fees de canal"
          total={summary.totalNetRevenue}
          value={summary.totalChannelFees}
        />
        <FeeCard
          label="Reembolsos"
          total={summary.totalRevenue}
          value={summary.totalRefunds}
          sub={`${summary.ordersRefunded} orden(es) reembolsada(s)`}
        />
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
            Envío cobrado al comprador
          </p>
          <p className="mt-1 text-lg font-black text-[#111111]">{formatCurrency(summary.shippingChargedToCustomer)}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#AAAAAA]">
            <Info className="h-3 w-3" /> No es costo logístico
          </p>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
            Alertas criticas
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {alerts.slice(0, 4).map((alert, index) => (
              <AlertCard key={`${alert.type}-${index}`} alert={alert} />
            ))}
          </div>
        </div>
      ) : null}

      {byChannel.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
            Contribución neta por canal
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byChannel.map((channel) => (
              <div
                key={channel.channel}
                className="flex items-center justify-between rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#111111]">{channel.channel}</p>
                  <p className="mt-1 text-xs text-[#888888]">
                    {channel.ordersCount} ordenes / {formatCurrency(channel.totalRevenue)}
                  </p>
                </div>
                <div className="text-right">
                  <HealthBadge health={channel.health} />
                  <p className="mt-1 text-xs font-bold tabular-nums text-[#111111]">
                    {formatPercent(channel.netContributionPercent, channel.totalRevenue > 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductsSection({
  dir,
  onSort,
  products,
  sort,
}: {
  dir: "asc" | "desc";
  onSort: (column: "revenue" | "margin" | "health") => void;
  products: ProductProfitability[];
  sort: string;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-10 w-10 text-[#CCCCCC]" />
        <p className="mt-4 text-sm font-bold text-[#888888]">
          Sin productos cobrados para analizar
        </p>
        <p className="mt-1 text-xs text-[#AAAAAA]">
          Cuando haya ventas liquidadas, los margenes apareceran aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <ThCell label="Producto" />
              <ThCell label="Uds." />
              <SortableThCell
                active={sort === "revenue"}
                dir={dir}
                label="Ingresos netos"
                onClick={() => onSort("revenue")}
              />
              <ThCell label="Costo" />
              <ThCell label="Fees" />
              <SortableThCell
                active={sort === "margin"}
                dir={dir}
                label="Contribución %"
                onClick={() => onSort("margin")}
              />
              <ThCell label="$/ud" />
              <ThCell label="Confianza" />
              <SortableThCell
                active={sort === "health"}
                dir={dir}
                label="Salud"
                onClick={() => onSort("health")}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {products.map((product) => (
              <tr
                key={product.productId}
                className="bg-white transition-colors hover:bg-gray-50/60"
              >
                <td className="px-6 py-4">
                  <div className="max-w-[220px]">
                    <div className="truncate text-sm font-bold text-[#111111]">
                      {product.title}
                    </div>
                    {product.supplier ? (
                      <p className="mt-0.5 truncate text-[10px] text-[#AAAAAA]">{product.supplier}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">
                  {product.unitsSold}
                  {product.refundedUnits > 0 ? (
                    <span className="ml-1 text-[10px] font-medium text-red-400">(-{product.refundedUnits})</span>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">
                  {formatCurrency(product.totalNetRevenue)}
                </td>
                <td className="px-6 py-4 text-sm font-medium tabular-nums text-[#888888]">
                  {product.hasCostData ? (
                    formatCurrency(product.totalCost)
                  ) : (
                    <span className="text-red-400">Sin costo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium tabular-nums text-[#888888]">
                  {formatCurrency(
                    product.totalPaymentFees + product.totalChannelFees
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      product.health === "uncertain"
                        ? "text-[#AAAAAA]"
                        : product.netContributionPercent < 0
                          ? "text-red-600"
                          : product.netContributionPercent < 15
                            ? "text-amber-600"
                            : "text-emerald-600"
                    )}
                  >
                    {product.health === "uncertain" || product.totalNetRevenue <= 0
                      ? "--"
                      : `${product.netContributionPercent}%`}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      product.health === "uncertain"
                        ? "text-[#AAAAAA]"
                        : product.contributionPerUnit < 0
                          ? "text-red-600"
                          : "text-emerald-600"
                    )}
                  >
                    {product.health === "uncertain" || product.unitsSold <= 0
                      ? "--"
                      : formatCurrency(product.contributionPerUnit)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ConfidenceBadge confidence={product.costConfidence} />
                </td>
                <td className="px-6 py-4">
                  <HealthBadge health={product.health} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-3">
        <p className="text-xs font-medium text-[#888888]">
          {products.length} producto(s) analizados
        </p>
      </div>
    </div>
  );
}

function ChannelsSection({ channels }: { channels: ChannelProfitability[] }) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-10 w-10 text-[#CCCCCC]" />
        <p className="mt-4 text-sm font-bold text-[#888888]">Sin datos por canal</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {channels.map((channel) => (
        <div
          key={channel.channel}
          className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-[#111111]">
                {channel.channel}
              </h3>
              <p className="mt-1 text-xs text-[#888888]">
                {channel.ordersCount} ordenes liquidadas
              </p>
            </div>
            <HealthBadge health={channel.health} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MiniKpi label="Ingresos netos" value={formatCurrency(channel.totalNetRevenue)} />
            <MiniKpi label="Costo" value={formatCurrency(channel.totalCost)} />
            <MiniKpi
              label="Fees pago"
              value={formatCurrency(channel.totalPaymentFees)}
            />
            <MiniKpi
              label="Fees canal"
              value={formatCurrency(channel.totalChannelFees)}
            />
            <MiniKpi
              label="$/orden"
              value={formatCurrency(channel.avgContributionPerOrder)}
            />
            <MiniKpi
              highlight
              label="Contribución neta"
              value={formatPercent(channel.netContributionPercent, channel.totalNetRevenue > 0)}
            />
          </div>

          <div className="mt-4">
            <ContributionBar
              cost={channel.totalCost}
              fees={channel.totalPaymentFees + channel.totalChannelFees}
              refunds={channel.totalRefundImpact}
              revenue={channel.totalRevenue}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsSection({
  criticals,
  warnings,
}: {
  criticals: ProfitabilityAlert[];
  warnings: ProfitabilityAlert[];
}) {
  if (criticals.length === 0 && warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldCheck className="h-10 w-10 text-emerald-400" />
        <p className="mt-4 text-sm font-bold text-[#111111]">Sin alertas activas</p>
        <p className="mt-1 text-xs text-[#888888]">
          No hay desvio critico dentro del periodo analizado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {criticals.length > 0 ? (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-600">
            <ShieldAlert className="h-3.5 w-3.5" /> Criticas ({criticals.length})
          </h3>
          <div className="space-y-3">
            {criticals.map((alert, index) => (
              <AlertCard key={`${alert.type}-${index}`} alert={alert} />
            ))}
          </div>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Advertencias ({warnings.length})
          </h3>
          <div className="space-y-3">
            {warnings.map((alert, index) => (
              <AlertCard key={`${alert.type}-${index}`} alert={alert} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  accent = false,
  health,
  label,
  positive,
  sub,
  value,
}: {
  accent?: boolean;
  health?: MarginHealth;
  label: string;
  positive?: boolean;
  sub?: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#EAEAEA] p-5 shadow-sm",
        accent ? "bg-[#111111]" : "bg-white"
      )}
    >
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.18em]",
          accent ? "text-gray-400" : "text-[#888888]"
        )}
      >
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className={cn(
            "text-2xl font-black tracking-tight",
            accent ? "text-white" : "text-[#111111]"
          )}
        >
          {value}
        </p>
        {health ? <HealthBadge health={health} /> : null}
      </div>
      {sub ? (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            accent
              ? "text-gray-500"
              : positive === true
                ? "text-emerald-600"
                : positive === false
                  ? "text-red-500"
                  : "text-[#888888]"
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function FeeCard({ label, total, value, sub }: { label: string; total: number; value: number; sub?: string }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-[#111111]">{formatCurrency(value)}</p>
      <p className="mt-0.5 text-xs font-medium text-[#888888]">
        {sub || `${pct}% del volumen`}
      </p>
    </div>
  );
}

function MiniKpi({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-bold tabular-nums",
          highlight ? "text-[#111111]" : "text-[#555555]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AlertCard({ alert }: { alert: ProfitabilityAlert }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 shadow-sm",
        alert.severity === "critical"
          ? "border-red-200 bg-red-50/50"
          : "border-amber-200 bg-amber-50/50"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          alert.severity === "critical" ? "bg-red-100" : "bg-amber-100"
        )}
      >
        {alert.severity === "critical" ? (
          <TrendingDown className="h-4 w-4 text-red-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#111111]">{alert.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#666666]">
          {alert.description}
        </p>
        {alert.actionHref && alert.actionLabel ? (
          <Link
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#111111] hover:underline"
            href={alert.actionHref}
          >
            {alert.actionLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function HealthBadge({ health }: { health: MarginHealth }) {
  const config: Record<MarginHealth, { cls: string; label: string }> = {
    profitable: { label: "Rentable", cls: "bg-emerald-100 text-emerald-700" },
    thin: { label: "Fino", cls: "bg-amber-100 text-amber-700" },
    at_risk: { label: "En riesgo", cls: "bg-orange-100 text-orange-700" },
    negative: { label: "Negativo", cls: "bg-red-100 text-red-700" },
    uncertain: { label: "Incierto", cls: "bg-gray-100 text-gray-500" },
  };

  const current = config[health];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        current.cls
      )}
    >
      {current.label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: CostConfidence }) {
  const config: Record<CostConfidence, { cls: string; label: string }> = {
    high: { label: "Alto", cls: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Medio", cls: "bg-amber-100 text-amber-700" },
    none: { label: "Sin dato", cls: "bg-red-100 text-red-600" },
  };

  const current = config[confidence];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        current.cls
      )}
    >
      {current.label}
    </span>
  );
}

function ContributionBar({
  cost,
  fees,
  refunds,
  revenue,
}: {
  cost: number;
  fees: number;
  refunds: number;
  revenue: number;
}) {
  if (revenue <= 0) {
    return <p className="text-xs font-medium text-[#888888]">Sin ingresos reconocidos.</p>;
  }

  const costPct = Math.min((cost / revenue) * 100, 100);
  const feesPct = Math.min((fees / revenue) * 100, 100 - costPct);
  const refundPct = Math.min((refunds / revenue) * 100, 100 - costPct - feesPct);
  const contributionPct = Math.max(100 - costPct - feesPct - refundPct, 0);

  return (
    <div className="space-y-1">
      <div className="flex h-3 overflow-hidden rounded-full bg-[#F0F0F0]">
        <div
          className="bg-gray-400"
          style={{ width: `${costPct}%` }}
          title={`Costo: ${costPct.toFixed(1)}%`}
        />
        <div
          className="bg-amber-400"
          style={{ width: `${feesPct}%` }}
          title={`Fees: ${feesPct.toFixed(1)}%`}
        />
        <div
          className="bg-red-400"
          style={{ width: `${refundPct}%` }}
          title={`Reembolsos: ${refundPct.toFixed(1)}%`}
        />
        <div
          className="bg-emerald-500"
          style={{ width: `${contributionPct}%` }}
          title={`Contribución: ${contributionPct.toFixed(1)}%`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-[#888888]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-400" /> Costo{" "}
          {costPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Fees{" "}
          {feesPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Reembolsos{" "}
          {refundPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Contribución{" "}
          {contributionPct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function ThCell({ label }: { label: string }) {
  return (
    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
      {label}
    </th>
  );
}

function SortableThCell({
  active,
  dir,
  label,
  onClick,
}: {
  active: boolean;
  dir: "asc" | "desc";
  label: string;
  onClick: () => void;
}) {
  return (
    <th className="px-6 py-4 text-left">
      <button
        className={cn(
          "flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
          active ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]"
        )}
        onClick={onClick}
        type="button"
      >
        {label}
        {active ? (
          dir === "desc" ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}

function formatPercent(value: number, hasRevenue: boolean) {
  if (!hasRevenue) return "--";
  return `${value}%`;
}

function healthRank(health: MarginHealth): number {
  switch (health) {
    case "negative":
      return 1;
    case "at_risk":
      return 2;
    case "uncertain":
      return 3;
    case "thin":
      return 4;
    case "profitable":
      return 5;
  }
}
