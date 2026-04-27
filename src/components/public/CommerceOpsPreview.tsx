import {
  ArrowDownRight,
  ArrowUpRight,
  Box,
  Boxes,
  CircleDollarSign,
  CreditCard,
  Layers,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

/* ─── CommerceOpsPreview ──────────────────────────────────────────────────
 *
 * Marketing-grade mock of the actual Nexora admin. It is NOT a screenshot;
 * it is a real HTML composition that renders inside the .product-mock
 * window chrome on the home page hero. The shape follows the real
 * dashboard:
 *
 *   ┌─ chrome ──────────────────────────────────────────────────┐
 *   │ tab strip (sidebar-style icons + active tab pill)         │
 *   ├───────────────────────────────────────────────────────────┤
 *   │ top bar with breadcrumb + "Hoy" range chip                │
 *   │ 4 KPI tiles (ingresos, pedidos, conversión, stock)        │
 *   │ left:  últimos pedidos (3 rows)                           │
 *   │ right: ventas hoy (sparkline) + 2 mini KPIs               │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Numbers are intentionally believable but NOT customer claims — they
 * are example shapes ("Ejemplo · sin datos reales" label below the
 * mock makes that explicit on the home).
 */

type TabRow = {
  readonly icon: typeof LayoutDashboard;
  readonly label: string;
  readonly active?: boolean;
};

const TABS: readonly TabRow[] = [
  { icon: LayoutDashboard, label: "Inicio", active: true },
  { icon: ShoppingBag, label: "Pedidos" },
  { icon: Layers, label: "Productos" },
  { icon: Users, label: "Clientes" },
  { icon: CreditCard, label: "Pagos" },
  { icon: Settings, label: "Ajustes" },
];

const KPIS = [
  {
    label: "Ingresos · hoy",
    value: "$ 184.420",
    delta: "+12,4%",
    trend: "up" as const,
    icon: CircleDollarSign,
  },
  {
    label: "Pedidos",
    value: "23",
    delta: "+4",
    trend: "up" as const,
    icon: ShoppingCart,
  },
  {
    label: "Conversión",
    value: "2,8%",
    delta: "+0,3 pts",
    trend: "up" as const,
    icon: ArrowUpRight,
  },
  {
    label: "Stock crítico",
    value: "6",
    delta: "−2",
    trend: "down" as const,
    icon: Boxes,
  },
] as const;

const ORDERS = [
  {
    id: "#A4-1928",
    customer: "Lucía Vázquez",
    sku: "Camisa Lino · Beige · M",
    total: "$ 18.900",
    state: "Pago confirmado",
    tone: "ok" as const,
  },
  {
    id: "#A4-1927",
    customer: "Mateo González",
    sku: "Bolso Esencial · Negro",
    total: "$ 26.500",
    state: "Preparando envío",
    tone: "info" as const,
  },
  {
    id: "#A4-1926",
    customer: "Catalina Ríos",
    sku: "Zapatillas Loop · 38",
    total: "$ 42.800",
    state: "En tránsito · Andreani",
    tone: "muted" as const,
  },
] as const;

// Sparkline points (rough sales-by-hour shape). Intentionally hand-tuned
// so the line reads as a believable today curve, not a perfect arc.
const SPARK_POINTS = [
  { x: 0, y: 28 },
  { x: 12, y: 26 },
  { x: 24, y: 22 },
  { x: 36, y: 24 },
  { x: 48, y: 18 },
  { x: 60, y: 16 },
  { x: 72, y: 20 },
  { x: 84, y: 13 },
  { x: 96, y: 10 },
  { x: 108, y: 14 },
  { x: 120, y: 8 },
  { x: 132, y: 11 },
  { x: 144, y: 6 },
] as const;

function buildSparkPath(): string {
  return SPARK_POINTS.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

export function CommerceOpsPreview({ className }: { className?: string }) {
  const sparkPath = buildSparkPath();

  return (
    <div className={`product-mock ${className ?? ""}`}>
      {/* ── Window chrome ── */}
      <div className="product-mock-chrome">
        <span aria-hidden className="product-mock-chrome-dot" />
        <span aria-hidden className="product-mock-chrome-dot" />
        <span aria-hidden className="product-mock-chrome-dot" />
        <span aria-hidden className="product-mock-chrome-bar" />
        <span className="text-[10.5px] font-medium tracking-[0.04em] text-ink-5">
          admin.nexora.app
        </span>
      </div>

      {/* ── App body ── */}
      <div className="grid grid-cols-[148px_1fr]">
        {/* Sidebar — narrow, icon-only-ish */}
        <aside className="border-r border-[color:var(--hairline)] bg-[#fbfaf6] px-2 py-3">
          <div className="mb-3 flex items-center gap-2 px-2">
            <span aria-hidden className="relative inline-flex h-4 w-4 items-center justify-center">
              <span className="absolute h-3 w-3 -translate-x-[1.5px] -translate-y-[1.5px] rounded-[2px] bg-[var(--accent-500)]" />
              <span className="absolute h-3 w-3 translate-x-[1.5px] translate-y-[1.5px] rounded-[2px] bg-ink-0" />
            </span>
            <span className="text-[11.5px] font-semibold tracking-[-0.02em] text-ink-0">
              nexora
            </span>
          </div>
          <ul className="space-y-0.5">
            {TABS.map(({ icon: Icon, label, active }) => (
              <li key={label}>
                <span
                  className={
                    active
                      ? "flex items-center gap-2 rounded-md bg-[rgba(0,0,32,0.06)] px-2 py-1.5 text-[11.5px] font-medium text-ink-0"
                      : "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-ink-5"
                  }
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main panel */}
        <div className="bg-[var(--surface-1)] p-4">
          {/* Top bar */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-6">
                Inicio
              </span>
              <span aria-hidden className="h-3 w-px bg-[color:var(--hairline)]" />
              <span className="text-[12px] font-medium text-ink-0">Resumen</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 py-1 text-[10.5px] font-medium text-ink-3">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]" />
              Hoy · en vivo
            </span>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-4 gap-2">
            {KPIS.map(({ label, value, delta, trend, icon: Icon }) => (
              <div
                key={label}
                className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-6">
                    {label}
                  </span>
                  <Icon className="h-3 w-3 text-ink-6" strokeWidth={1.75} />
                </div>
                <p className="mt-1 tabular-nums text-[16px] font-semibold leading-none tracking-[-0.025em] text-ink-0">
                  {value}
                </p>
                <p
                  className={
                    trend === "up"
                      ? "mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[color:var(--signal-success)]"
                      : "mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[color:var(--signal-danger)]"
                  }
                >
                  {trend === "up" ? (
                    <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2} />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5" strokeWidth={2} />
                  )}
                  {delta}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom row — orders + chart */}
          <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2">
            {/* Orders */}
            <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-paper)]">
              <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-3 py-2">
                <span className="text-[10.5px] font-semibold tracking-[-0.01em] text-ink-0">
                  Últimos pedidos
                </span>
                <span className="text-[9.5px] font-medium text-ink-5">Ver todo</span>
              </div>
              <ul className="divide-y divide-[color:var(--hairline)]">
                {ORDERS.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(0,0,32,0.05)] text-ink-3">
                      <Box className="h-3 w-3" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums text-[10.5px] font-semibold text-ink-0">
                          {o.id}
                        </span>
                        <span className="truncate text-[10.5px] text-ink-5">· {o.customer}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[9.5px] text-ink-5">{o.sku}</p>
                    </div>
                    <span className="tabular-nums text-[10.5px] font-medium text-ink-0">
                      {o.total}
                    </span>
                    <span
                      className={
                        o.tone === "ok"
                          ? "ml-1 inline-flex h-5 items-center rounded-full bg-[color:var(--signal-success)]/10 px-2 text-[9px] font-medium text-[color:var(--signal-success)]"
                          : o.tone === "info"
                          ? "ml-1 inline-flex h-5 items-center rounded-full bg-[var(--brand-soft)] px-2 text-[9px] font-medium text-[var(--brand)]"
                          : "ml-1 inline-flex h-5 items-center rounded-full border border-[color:var(--hairline)] px-2 text-[9px] font-medium text-ink-5"
                      }
                    >
                      {o.state}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chart + side stats */}
            <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold tracking-[-0.01em] text-ink-0">
                  Ventas hoy
                </span>
                <span className="tabular-nums text-[10px] font-medium text-ink-5">14:00 hs</span>
              </div>
              <div className="mt-2 h-14 w-full">
                <svg viewBox="0 0 144 32" className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="commerce-spark" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${sparkPath} L 144,32 L 0,32 Z`}
                    fill="url(#commerce-spark)"
                  />
                  <path
                    d={sparkPath}
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[color:var(--hairline)] pt-2">
                <div>
                  <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-6">
                    Ticket prom.
                  </span>
                  <p className="tabular-nums text-[12px] font-semibold text-ink-0">$ 8.018</p>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-6">
                    Envíos
                  </span>
                  <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-0">
                    <Truck className="h-3 w-3" strokeWidth={1.75} />
                    21
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
